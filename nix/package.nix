{ lib, buildGoModule }:

buildGoModule rec {
  pname = "lexigraph";
  version = "0.4.0";

  src = lib.cleanSource ../.;
  vendorHash = null;
  subPackages = [ "cmd/lexigraph" ];

  ldflags = [
    "-s"
    "-w"
    "-X main.version=${version}"
  ];

  postInstall = ''
    install -Dm644 ${src}/public/data/netem.json \
      $out/share/lexigraph/netem.json
  '';

  meta = {
    description = "Keyboard-first NETEM vocabulary trainer for the terminal";
    homepage = "https://github.com/Eurekaimer/lexigraph";
    license = lib.licenses.mit;
    mainProgram = "lexigraph";
    platforms = lib.platforms.linux;
  };
}
