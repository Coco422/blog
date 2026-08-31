# `warp-google.sh` 静态审计

审计对象：`files/warp-google.sh` v1.0.0

SHA-256：`4c45421ad25eac15bf09dda25d6296cfef01e111e086f2f02001531bdd4fc52a`

审计日期：2026-08-31

验证范围：来源核对、人工阅读、`bash -n`；未以 root 执行，未做 VPS 实测。

## 结论

脚本安装的 WARP 软件包来自 Cloudflare 官方域名 `pkg.cloudflareclient.com`，使用的 `cloudflare-warp`、`warp-cli` 和 Local proxy/SOCKS5 模式也是 Cloudflare 官方客户端能力。

但 Google 分流并不是 Cloudflare 官方方案。它由原作者使用 `redsocks`、`iptables`、IPv6 黑洞路由、`gai.conf` 和自建 systemd 服务组合完成。因此，更准确的说法是“官方 WARP 客户端 + 第三方透明分流脚本”。

当前版本不建议直接通过 `bash <(curl ...)` 在重要服务器执行。它没有发现明显的远程二次载荷或凭据窃取逻辑，但存在足以影响系统网络和包管理的实现风险。

## 主要问题

### 1. 会破坏已有的 `policy-rc.d`

脚本直接写入 `/usr/sbin/policy-rc.d`，安装依赖后又无条件删除。如果机器原本就有这个文件，原有策略会丢失；如果中途失败，临时文件还可能残留。

### 2. WARP 配置失败也可能继续报“成功”

注册、切换代理模式、设置端口和连接命令都把错误重定向到 `/dev/null`，最后用 `|| true` 吞掉失败。随后脚本仍继续创建规则，并把状态打印成 `[OK]`。

### 3. 当前规则不是“所有 Google 流量”

`iptables` 规则只匹配 `-p tcp`，而 Google/YouTube 等服务可能使用 UDP/443 的 QUIC/HTTP3。脚本没有把这些 UDP 流量送入 WARP，也没有显式阻断它们。

### 4. Google IP 清单既不完整，也有过宽网段

2026-08-31 抓取的官方 `goog.json` 有 130 条 IPv4、15 条 IPv6 前缀；原脚本硬编码 21 条 IPv4、10 条 IPv6。按网络包含关系计算，脚本规则覆盖官方清单中的 38 条 IPv4、10 条 IPv6 前缀，但这个数字不能理解为完整覆盖：`34.0.0.0/9`、`35.192.0.0/12` 等规则比官方条目更宽，会把额外地址也一起代理；同时仍漏掉大量官方前缀。

脚本还声称“Google IPv6 全部加黑洞”，但与归档时官方清单相比缺少 5 条 IPv6 前缀。

### 5. “完整卸载”并不完整

卸载会移除脚本创建的服务、部分规则和软件包，但不会撤销追加到 `/etc/gai.conf` 的 IPv4 优先设置，也不会恢复被覆盖的 `/etc/redsocks.conf`、`/usr/local/bin/warp` 或原有包仓库配置。

### 6. 可能影响同机其他服务

脚本使用 `pkill redsocks`，会结束机器上的所有 `redsocks` 进程，而不仅是本脚本创建的实例。它还直接占用 `/etc/redsocks.conf`、`/usr/local/bin/warp`、iptables 的 `OUTPUT` 链和固定端口 12345/40000。

### 7. RPM 安装路径与当前官方说明不完全一致

APT 部分的来源、密钥和包名与 Cloudflare 官方仓库基本一致。RPM 部分则自行写入 `baseurl=https://pkg.cloudflareclient.com/rpm`；当前 Cloudflare 官方说明要求下载官方生成的 `cloudflare-warp-ascii.repo`，且 RHEL 9+ 需要先启用 EPEL。原脚本没有处理这个前置条件。

### 8. 代理模式需要考虑 MASQUE

Cloudflare 当前说明中，Local proxy 是官方模式；从 2025.8.779.0 起，Proxy mode 只支持 MASQUE。新安装默认通常是 MASQUE，但原脚本遇到已安装的 `warp-cli` 会直接跳过包安装，也没有检查或切换 tunnel protocol，旧配置可能因此连接失败。

### 9. 来源没有明确许可证

“代码可见”“代码完全开源”不等于已经给出可再分发、修改和商用的许可。当前页面、脚本和配套文章均未发现 LICENSE 文本或许可证标识，因此原样公开镜像仍需作者授权。

## 可保留的设计

- WARP 包只从 Cloudflare 官方软件源安装，而不是下载未知二进制。
- 使用 Local proxy 避免直接接管全机默认路由，这个方向合理。
- 给分流规则单独建 `WARP_GOOGLE` 链，理论上比把所有规则直接塞进 `OUTPUT` 更容易管理。
- 提供状态、启停、测试和卸载入口，适合作为后续可维护版本的交互参考。

## 后续自维护版本的最低要求

1. 使用 Cloudflare 当前官方仓库配置和支持矩阵，明确只支持实际测试过的发行版。
2. 检查 `warp-cli` 版本、MASQUE、注册、代理模式、端口和连接状态；任何关键步骤失败立即停止。
3. 从 Google 官方 `goog.json` 生成 ipset/nftables 集合，保存抓取时间和哈希，更新失败时保留上一个可用版本。
4. 明确处理 TCP 与 UDP/QUIC，不再宣称未验证的“所有流量”。
5. 所有被覆盖或追加的系统文件先备份，使用 trap 恢复临时状态；不结束不属于本服务的进程。
6. 安装前检查端口、文件、命令名、iptables/nftables 后端冲突；卸载只清理由本版本创建且带标识的资源。
7. 在一次性 VPS 上覆盖安装、重复安装、重启、升级、断网、卸载和故障回滚测试，再把草稿改成可执行教程。
