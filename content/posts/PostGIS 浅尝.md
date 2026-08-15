---
title: PostGIS 入门：geometry、geography、SRID 与空间查询示例
description: 用 PostgreSQL 的 PostGIS 扩展理解 geometry 与 geography、SRID、空间索引和距离查询，并给出创建空间表与常用 SQL 示例。
date: 2026-01-26T11:33:52+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-16T01:07:39+08:00
showLastMod: true
tags:
  - postgis
categories:
  - 杂技浅尝
---
## 什么是 PostGIS

PostGIS 是 PostgreSQL 数据库的一个扩展，它允许在数据库中存储和操作 GIS（地理信息系统）空间数据。它为 PostgreSQL 添加了空间数据类型、索引和大量空间函数，可以进行地理分析、距离计算、空间查询等操作。 [PostGIS](https://www.postgis.net/docs)

## 安装并启用 PostGIS

在 PostgreSQL 数据库中启用 PostGIS，需要使用 SQL 命令创建扩展。示例：

```SQL
CREATE EXTENSION postgis;
```

启用后，数据库将支持空间数据类型如 geometry 和 geography。

## geometry 与 geography 空间数据类型

### 坐标系统与单位

- **SRID 4326**：WGS84 坐标系，通常用于 GPS 经纬度数据。
- **GEOGRAPHY 类型**：采用球面/椭球面计算真实地球表面距离（单位是米）.
- **GEOMETRY 类型**：采用平面坐标计算，通常用于投影坐标系，不适合直接计算地球表面距离。

### geometry

geometry 是用于表示平面（笛卡尔）空间几何对象的数据类型，支持点、线、多边形等多种几何类型。空间行为依赖于坐标参考系统（SRID）。

常见的几何类型包括：

- POINT：单个点
- LINESTRING：线段序列
- POLYGON：多边形
- MULTIPOINT、MULTILINESTRING、MULTIPOLYGON：复合几何类型
### geography

  geography 是用于地理空间数据的类型，面向真实球面或椭球体，适合经纬度数据和真实地球距离的计算。使用此类型的距离和面积计算会基于地球模型返回现实世界的单位（如米）。

## SRID：空间参考系统
 
空间数据的坐标依赖空间参考系统（SRID）。常见的 SRID 包括：

- **4326（WGS84）**：基于全球 GPS 坐标，经度/纬度，常用于地理坐标。

使用 SRID 能确保空间对象在正确的参考系统下解释和计算。

## 创建、标注与转换空间数据

### 创建几何点

```Sql
SELECT ST_MakePoint(-121.97, 37.38);
```

这个函数会返回一个 geometry 类型的点对象。
### 设置 SRID

几何对象默认没有空间参考，必须设置 SRID：

```sql
SELECT ST_SetSRID(ST_MakePoint(-121.97, 37.38), 4326);
```

这样这个点就有了 WGS84 坐标系统标识。
### 将 geometry 转为 geography

对真实球体距离计算，常用地理类型：

```sql
SELECT ST_SetSRID(ST_MakePoint(-121.97, 37.38), 4326)::geography;
```

## WKT 与空间对象的文本表示

空间对象可以转换为可读的文本格式（WKT）：

```sql
SELECT ST_AsText(geom);
```

返回类似 POINT(-121.97 37.38) 的文本。

## 提取几何属性

- ST_X(geom)：提取点的 X 坐标（经度）。
- ST_Y(geom)：提取点的 Y 坐标（纬度）。

例如：

```sql
SELECT ST_X(geom), ST_Y(geom) FROM points;
```

## 空间距离与范围查询

### 计算距离

对地理对象之间距离的计算（返回米）：

```sql
SELECT ST_Distance(a::geography, b::geography);
```

这里将 geometry 强制转换为 geography 用于真实地球距离计算。
### 按距离范围查询

查找在某点 R 米以内的对象：

```Plain
WHERE ST_DWithin(location::geography, center::geography, R);
```

ST_DWithin 在范围比较中常与索引结合使用提高性能。

## 创建空间表

示例：创建包含 geography(Point) 类型的表

```sql
CREATE TABLE airports (
  code VARCHAR(3),
  geog GEOGRAPHY(Point)
);
```

然后插入点数据：

```sql
INSERT INTO airports VALUES ('LAX', 'POINT(-118.4079 33.9434)');
```

新插入数据的 geog 列类型为 地理点类型。

## 为空间查询创建索引

创建空间索引可以显著提高查询性能。常用的是 GiST 索引：

```sql
CREATE INDEX idx_airports_geog ON airports USING GIST (geog);
```

索引对大规模空间数据的查询是关键。

## 常用 PostGIS 函数

PostGIS 包含大量函数用于计算几何/地理属性、空间关系和分析。以下仅列出常见的一部分来自官方函数清单：

- ST_Transform(geometry, srid)：将几何对象转换到指定的 SRID。
- ST_Distance(geomA, geomB)：计算两空间对象的最小距离。
- ST_DWithin(geomA, geomB, distance)：判断对象是否在指定距离内。

## 官方文档与参考

强烈建议学习官方手册和教程，它们包括更详细的章节和练习：

- 官方手册（English）：https://postgis.net/docs/manual/
- 官方入门教程（Workshops / Introduction）：https://postgis.net/workshops/postgis-intro/
## 常用函数速查

|   |   |   |
|---|---|---|
|函数|用途|示例|
|`ST_MakePoint(lng, lat)`|创建二维点几何对象|`SELECT ST_MakePoint(-121.97, 37.38);`|
|`ST_SetSRID(geom, 4326)`|为几何对象设置空间参考系统|`SELECT ST_SetSRID(point, 4326);`|
|`::geography`|将几何类型转换为地理类型|`SELECT point::geography;`|
|`ST_AsText(geom)`|将几何或地理对象转为 WKT 可读文本|`SELECT ST_AsText(geog);`|
|`ST_X(geom)`|提取点的经度|`SELECT ST_X(geom);`|
|`ST_Y(geom)`|提取点的纬度|`SELECT ST_Y(geom);`|
|`ST_Distance(geog1, geog2)`|计算两点间距离（地理类型返回米）|`SELECT ST_Distance(a::geography, b::geography);`|
|`ST_DWithin(geog, center, radius)`|判断点是否在指定半径范围内|`WHERE ST_DWithin(location::geography, center::geography, 10000);`|

## geometry 与 geography 的选择

- **SRID 4326**：WGS84 坐标系，通常用于 GPS 经纬度数据。
- **GEOGRAPHY 类型**：采用球面/椭球面计算真实地球表面距离（单位是米）。
- **GEOMETRY 类型**：采用平面坐标计算，通常用于投影坐标系，不适合直接计算地球表面距离。
