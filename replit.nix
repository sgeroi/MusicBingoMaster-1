{pkgs}: {
  deps = [
    pkgs.libGL
    pkgs.pango
    pkgs.cairo
    pkgs.pkg-config
    pkgs.util-linux
  ];
}
