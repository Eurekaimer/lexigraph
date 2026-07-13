{
  description = "Lexigraph — local-first NETEM vocabulary review for web and terminal";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          lexigraph = pkgs.callPackage ./nix/package.nix { };
          default = self.packages.${system}.lexigraph;
        });

      apps = forAllSystems (system: {
        lexigraph = {
          type = "app";
          program = "${self.packages.${system}.lexigraph}/bin/lexigraph";
        };
        default = self.apps.${system}.lexigraph;
      });

      devShells = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.mkShell {
            packages = [ pkgs.go pkgs.nodejs_22 ];
          };
        });

      # Once the host declares a `lexigraph` flake input, importing this module
      # is the single line that adds the command to the whole NixOS system.
      nixosModules.default = { pkgs, ... }: {
        environment.systemPackages = [
          self.packages.${pkgs.system}.lexigraph
        ];
      };
    };
}
