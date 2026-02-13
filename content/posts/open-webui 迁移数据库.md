---
title: open-webui 迁移数据库
description:
date: 2026-02-13T18:29:44+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-13T19:21:12+08:00
showLastMod: true
tags:
categories:
---
## 原因

我的 Open Web UI 最早的时候用的是 SQLite 数据库，用久了之后，发现性能总感觉跟不上。所以决定迁移到 Postgres 数据库里。

## 脚本

用 claude opus 4.6 分析了一圈


  关键差异总结：
  1. auth.active: SQLite 是 INTEGER (0/1)，PG 是 BOOLEAN — 需要转换
  2. chat.created_at/updated_at: SQLite 存的是 Unix 时间戳整数，PG 是 BIGINT — 兼容
  3. config.created_at/updated_at: SQLite 是 DATETIME 字符串，PG 是 timestamp without time zone — 需要保持字符串格式
  4. function/model/tool.is_active/is_global: SQLite 是 INTEGER (0/1)，PG 是 BOOLEAN
  5. 一些旧表（auth, chatidtag, file, function, model, tool）在两边都没有显式 PK 约束


以下是用到的 python 脚本，注意，本脚本只对 `23f47d28bfc3` 这个 ID 的镜像有效，请注意有效期。各位可以按照差不多的规则自己 下载 pg 的镜像和 sqlite 的 然后对比分析下

```python
#!/usr/bin/env python3
"""
Open WebUI SQLite -> PostgreSQL Migration Script

Usage:
    python3 migrate_sqlite_to_pg.py \
        --sqlite /path/to/webui.db \
        --pg "postgresql://user:pwd@127.0.0.1:5432/postgres"

Prerequisites:
    pip install psycopg2-binary

Notes:
    - The target PostgreSQL database must already have the schema created
      (by running Open WebUI once with the PG connection).
    - This script will TRUNCATE all target tables before inserting.
    - Run this with the Open WebUI container STOPPED.
"""

import argparse
import json
import sqlite3
import sys
import time

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


# Tables in dependency order (parents before children) to handle FK constraints.
# Tables without FK dependencies come first.
TABLES_ORDERED = [
    "user",
    "auth",
    "config",
    "document",
    "migratehistory",
    "alembic_version",
    "memory",
    "model",
    "function",
    "tool",
    "skill",
    "prompt",
    "prompt_history",
    "knowledge",
    "file",
    "knowledge_file",
    "group",
    "group_member",
    "channel",
    "channel_webhook",
    "channel_member",
    "message",
    "message_reaction",
    "channel_file",
    "chat",
    "chat_file",
    "chat_message",
    "chatidtag",
    "tag",
    "folder",
    "feedback",
    "note",
    "api_key",
    "oauth_session",
    "access_grant",
]

# Columns that need INTEGER (0/1) -> BOOLEAN conversion
BOOL_COLUMNS = {
    "auth": ["active"],
    "function": ["is_active", "is_global"],
    "model": ["is_active"],
    "chat": ["archived", "pinned"],
    "channel": ["is_private"],
    "channel_member": ["is_active", "is_channel_muted", "is_channel_pinned"],
    "chat_message": ["done"],
    "folder": ["is_expanded"],
    "message": ["is_pinned"],
    "prompt": ["is_active"],
    "skill": ["is_active"],
}

# config table: created_at/updated_at are DATETIME strings in SQLite,
# timestamp without time zone in PG — pass as-is, PG will parse them.


def get_sqlite_columns(sqlite_cur, table_name):
    """Get column names for a SQLite table."""
    sqlite_cur.execute(f'PRAGMA table_info("{table_name}")')
    return [row[1] for row in sqlite_cur.fetchall()]


def get_pg_columns(pg_cur, table_name):
    """Get column names for a PG table."""
    pg_cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """,
        (table_name,),
    )
    return [row[0] for row in pg_cur.fetchall()]


def convert_row(table_name, columns, row):
    """Convert a SQLite row for PG insertion, handling type differences."""
    converted = list(row)
    bool_cols = BOOL_COLUMNS.get(table_name, [])

    for i, col in enumerate(columns):
        val = converted[i]

        # INTEGER -> BOOLEAN conversion
        if col in bool_cols and val is not None:
            converted[i] = bool(val)

        # Ensure JSON columns that are strings get passed as-is
        # (psycopg2 handles this correctly with Json wrapper if needed,
        #  but PG json type accepts text strings directly)

    return tuple(converted)


def migrate_table(sqlite_cur, pg_cur, table_name, batch_size=1000):
    """Migrate a single table from SQLite to PostgreSQL."""
    # Get columns present in both databases
    sqlite_cols = get_sqlite_columns(sqlite_cur, table_name)
    pg_cols = get_pg_columns(pg_cur, table_name)

    # Use intersection, preserving PG column order
    common_cols = [c for c in pg_cols if c in sqlite_cols]

    if not common_cols:
        print(f"  SKIP {table_name}: no common columns found")
        return 0

    # Extra columns in either side (for info)
    sqlite_only = set(sqlite_cols) - set(pg_cols)
    pg_only = set(pg_cols) - set(sqlite_cols)
    if sqlite_only:
        print(f"  INFO: columns only in SQLite (will be skipped): {sqlite_only}")
    if pg_only:
        print(f"  INFO: columns only in PG (will use defaults): {pg_only}")

    # Read from SQLite
    col_list_sqlite = ", ".join(f'"{c}"' for c in common_cols)
    sqlite_cur.execute(f'SELECT {col_list_sqlite} FROM "{table_name}"')

    total = 0
    while True:
        rows = sqlite_cur.fetchmany(batch_size)
        if not rows:
            break

        converted_rows = [convert_row(table_name, common_cols, row) for row in rows]

        # Build INSERT statement
        col_list_pg = ", ".join(f'"{c}"' for c in common_cols)
        placeholders = ", ".join(["%s"] * len(common_cols))
        insert_sql = f'INSERT INTO "{table_name}" ({col_list_pg}) VALUES ({placeholders})'

        psycopg2.extras.execute_batch(pg_cur, insert_sql, converted_rows, page_size=batch_size)
        total += len(rows)

    return total


def reset_sequences(pg_cur):
    """Reset auto-increment sequences for tables with serial/sequence PKs."""
    sequences = [
        ("config", "config_id_seq", "id"),
        ("document", "document_id_seq", "id"),
        ("migratehistory", "migratehistory_id_seq", "id"),
    ]
    for table, seq, col in sequences:
        pg_cur.execute(f'SELECT COALESCE(MAX("{col}"), 0) FROM "{table}"')
        max_val = pg_cur.fetchone()[0]
        if max_val:
            pg_cur.execute(f"SELECT setval('{seq}', {max_val})")
            print(f"  Sequence {seq} set to {max_val}")


def main():
    parser = argparse.ArgumentParser(description="Migrate Open WebUI from SQLite to PostgreSQL")
    parser.add_argument("--sqlite", required=True, help="Path to SQLite database file")
    parser.add_argument("--pg", required=True, help="PostgreSQL connection string")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size for inserts (default: 500)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without writing")
    args = parser.parse_args()

    print(f"=== Open WebUI SQLite -> PostgreSQL Migration ===")
    print(f"Source: {args.sqlite}")
    print(f"Target: {args.pg.split('@')[0].split('://')[0]}://***@{args.pg.split('@')[-1]}")
    print()

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(args.sqlite)
    sqlite_conn.row_factory = None  # return tuples
    sqlite_cur = sqlite_conn.cursor()

    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(args.pg)
    pg_cur = pg_conn.cursor()

    # Verify both databases have the same alembic version
    sqlite_cur.execute("SELECT version_num FROM alembic_version")
    sqlite_ver = sqlite_cur.fetchone()
    pg_cur.execute("SELECT version_num FROM alembic_version")
    pg_ver = pg_cur.fetchone()

    if sqlite_ver and pg_ver and sqlite_ver[0] != pg_ver[0]:
        print(f"WARNING: Alembic version mismatch!")
        print(f"  SQLite:     {sqlite_ver[0]}")
        print(f"  PostgreSQL: {pg_ver[0]}")
        resp = input("Continue anyway? (y/N): ")
        if resp.lower() != "y":
            print("Aborted.")
            sys.exit(1)
    elif sqlite_ver and pg_ver:
        print(f"Alembic version match: {sqlite_ver[0]}")

    print()

    if args.dry_run:
        print("=== DRY RUN MODE ===")
        print()

    # Disable FK checks and truncate all target tables (reverse order)
    print("Preparing target database...")
    pg_cur.execute("SET session_replication_role = 'replica';")  # disable FK triggers

    for table in reversed(TABLES_ORDERED):
        try:
            if not args.dry_run:
                pg_cur.execute(f'TRUNCATE TABLE "{table}" CASCADE')
            print(f"  TRUNCATE {table}")
        except Exception as e:
            pg_conn.rollback()
            pg_cur.execute("SET session_replication_role = 'replica';")
            print(f"  TRUNCATE {table} - skipped ({e})")

    if not args.dry_run:
        pg_conn.commit()
    print()

    # Migrate each table
    start_time = time.time()
    total_rows = 0
    errors = []

    for table in TABLES_ORDERED:
        try:
            sqlite_cur.execute(f'SELECT count(*) FROM "{table}"')
            count = sqlite_cur.fetchone()[0]

            if count == 0:
                print(f"[{table}] 0 rows - skip")
                continue

            print(f"[{table}] {count} rows...", end=" ", flush=True)

            if args.dry_run:
                print("(dry run)")
                continue

            migrated = migrate_table(sqlite_cur, pg_cur, table, args.batch_size)
            pg_conn.commit()
            print(f"OK ({migrated} migrated)")
            total_rows += migrated

        except Exception as e:
            pg_conn.rollback()
            # Re-disable FK triggers after rollback
            pg_cur.execute("SET session_replication_role = 'replica';")
            print(f"ERROR: {e}")
            errors.append((table, str(e)))

    print()

    # Reset sequences
    if not args.dry_run:
        print("Resetting sequences...")
        try:
            reset_sequences(pg_cur)
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print(f"  Sequence reset error: {e}")

    # Re-enable FK triggers
    pg_cur.execute("SET session_replication_role = 'origin';")
    pg_conn.commit()

    elapsed = time.time() - start_time
    print()
    print(f"=== Migration Complete ===")
    print(f"Total rows migrated: {total_rows}")
    print(f"Time: {elapsed:.1f}s")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for table, err in errors:
            print(f"  {table}: {err}")
        sys.exit(1)

    # Verification
    print("\n=== Verification ===")
    for table in TABLES_ORDERED:
        sqlite_cur.execute(f'SELECT count(*) FROM "{table}"')
        s_count = sqlite_cur.fetchone()[0]
        if s_count == 0:
            continue
        pg_cur.execute(f'SELECT count(*) FROM "{table}"')
        p_count = pg_cur.fetchone()[0]
        status = "OK" if s_count == p_count else f"MISMATCH (sqlite={s_count}, pg={p_count})"
        print(f"  {table}: {p_count} {status}")

    sqlite_conn.close()
    pg_cur.close()
    pg_conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()

```

## 执行

![image.png](https://imgbed.szmckj.cn/uploads/2026/02/13/698efeaca9368.png)
执行完之后 再运行
![image.png](https://imgbed.szmckj.cn/uploads/2026/02/13/698f08c226e0a.png)
即可