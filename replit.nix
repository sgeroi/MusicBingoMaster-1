{pkgs}: {
  deps = [
    pkgs.postgresql
    pkgs.libGL
    pkgs.pango
    pkgs.cairo
    pkgs.pkg-config
    pkgs.util-linux
  ];
}
