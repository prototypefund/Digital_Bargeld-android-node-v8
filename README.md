# node/v8 shared library build for Android

This repository contains build scripts, build system fixes and other changes
needed to build node/v8 as a shared library for Android.  Currently we only
build for arm CPUs.

## Build instructions

Run

```
./android-node-v8/taler-android-build/build-android-v8 $NDK
./android-node-v8/taler-android-build/build-android-node $NDK
```

where `$NDK` is the path to the ndk-bundle in the Android SDK.

## Details

The V8 bundled with node still has a crash on ARM with the build configuration
we use.  This is already fixed upstream
(https://bugs.chromium.org/p/v8/issues/detail?id=9171).  In this repository, we
cherry-picked this patch manually.

Newer versions of v8 use their own in-tree C++ standard library.  This is bad
when embedding.  In this repository, the v8 build system is patched to
re-introduce the ability to build v8 with the NDKs standard library.

Normally, node uses gyp to build v8.  Meanwhile v8 has switched to gn, another
build system. The gyp build files do not support cross-compiling v8 to Android.
Thus we build the v8 included in the source tree of node as a standalone build.

Many other small fixes had to be applied, see the git log for more details.

## Todo

* We currently only build for 32-bit ARM CPUs.  Android supports other architectures
  too (x86, arm64, ...), and our build scripts should be extended to target these as well.
* Node has the ability to create v8 heap snapshot that include node's JS code.
  However this currently does not work when cross-compiling to Android.
  Fixing this might give us some startup performance improvement.
* We could also bundle the whole GNU Taler wallet code with node
  for further performance improvements.
* OpenSSL is curently built without asm support.  Making this work could
  lead to some perf improvements.
* Currently some i18n functionality of node is disabled.  We don't need it right
  now for the wallet, but it might be nice if cross-compilation of node's dependencies
  for i18n worked.
