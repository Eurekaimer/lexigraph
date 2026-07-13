# 在 NixOS 中使用 Lexigraph TUI

Lexigraph 的终端版本是一个 Linux 原生命令。它与网页版本使用相同的复习字段和 JSON 档案结构，但默认把数据独立保存在：

```text
$XDG_DATA_HOME/lexigraph/profile.json
```

没有设置 `XDG_DATA_HOME` 时，实际路径是：

```text
~/.local/share/lexigraph/profile.json
```

每次评分、撤销、增加学习组或导入数据后都会原子写入该文件；文件权限为 `0600`。

## 不修改系统配置：立即运行或安装

只运行一次：

```bash
nix run github:Eurekaimer/lexigraph
```

安装到当前用户的 Nix profile：

```bash
nix profile install github:Eurekaimer/lexigraph
lexigraph
```

`nix profile install` 修改的是用户 profile，不是 `/etc/nixos/configuration.nix`。因此它不需要改系统配置，但也不会成为声明式 NixOS 配置的一部分。

更新与卸载：

```bash
nix profile list
nix profile upgrade lexigraph
nix profile remove lexigraph
```

## 声明式安装：推荐的 Flake 配置

在你自己的 NixOS `flake.nix` 的 `inputs` 中加入：

```nix
lexigraph.url = "github:Eurekaimer/lexigraph";
```

确保 `outputs` 可以把 `inputs` 传给 NixOS 模块，例如：

```nix
outputs = inputs@{ self, nixpkgs, ... }: {
  nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
    specialArgs = { inherit inputs; };
    modules = [ ./configuration.nix ];
  };
};
```

然后在 `configuration.nix` 中只需加入一行：

```nix
imports = [ inputs.lexigraph.nixosModules.default ];
```

运行：

```bash
sudo nixos-rebuild switch --flake .#your-host
```

这里的“两处配置”分别承担不同职责：input 锁定 GitHub 来源，module 声明系统需要安装该软件。Nix 无法在保持声明式和可复现的前提下省略来源定义。

如果你不想导入模块，也可以直接把包加入已有列表：

```nix
environment.systemPackages = with pkgs; [
  inputs.lexigraph.packages.${pkgs.system}.default
];
```

## 传统 `configuration.nix` 的单行方式

没有使用 Flake 的系统可以在 `environment.systemPackages` 中加入下面这一项：

```nix
(pkgs.callPackage ((builtins.fetchTarball "https://github.com/Eurekaimer/lexigraph/archive/main.tar.gz") + "/nix/package.nix") {})
```

这种写法确实只占一行，但它跟踪不断变化的 `main`，没有由 `flake.lock` 固定版本。个人临时使用没有问题，长期配置建议固定提交和哈希，或改用上面的 Flake input。

## 键盘流

| 操作 | 按键 |
| --- | --- |
| 显示或遮住释义 | `Space` |
| 移动四档评分选择 | `h` / `l` |
| 提交当前选择 | `Enter` |
| 直接评分 | `A` / `S` / `D` / `W` |
| 撤销 | `Z` 或 `U` |
| 增加 20 个新词 | `+` |
| 打开操作菜单 | `m`，随后使用 `j` / `k` 和 `Enter` |
| 打开 Vim 式命令行 | `:` |
| 学习 / 记录 / 统计 | `1` / `2` / `3` |
| 帮助 | `?` |
| 保存并退出 | `q` |

常用命令：

```text
:add
:export ~/lexigraph-profile.json
:import ~/Downloads/lexigraph-profile.json
:write
:history
:stats
:wq
```

也可以从 shell 直接导入或导出：

```bash
lexigraph --import ~/Downloads/lexigraph-profile.json
lexigraph --export ~/lexigraph-backup.json
lexigraph --profile ~/private/lexigraph.json
```

## 从仓库本地构建

```bash
git clone https://github.com/Eurekaimer/lexigraph.git
cd lexigraph
nix build
./result/bin/lexigraph
```

开发环境：

```bash
nix develop
go test ./...
go run ./cmd/lexigraph
```

## 以后提交到 nixpkgs

现在不需要把项目提交到 nixpkgs；GitHub Flake 已经可以完整安装。以后如需进入官方仓库，主要流程是：

1. 为项目创建稳定版本标签和 GitHub Release。
2. 把 `nix/package.nix` 改为从固定 release 源获取，并填写源码哈希。
3. 在 nixpkgs 的 `pkgs/by-name/le/lexigraph/package.nix` 增加包定义。
4. 运行 `nix-build -A lexigraph`、`nixpkgs-review` 和基础运行测试。
5. 向 `NixOS/nixpkgs` 提交 pull request，并在后续版本中维护更新脚本。

因为当前 Go 模块没有第三方依赖，`vendorHash = null`，未来打包时不需要额外维护 Go 依赖哈希。
