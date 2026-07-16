# Add project specific ProGuard rules here.

# ==================== React Native ====================
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.proguard.annotations.KeepGettersAndSetters *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native - SoLoader
-keep class com.facebook.soloader.** { *; }

# ==================== Hermes ====================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ==================== Google Sign-In / Play Services Auth ====================
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.internal.** { *; }

-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# ==================== Firebase ====================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Firebase Auth
-keepattributes Signature
-keepattributes *Annotation*

# Firebase Crashlytics
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# ==================== OkHttp ====================
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ==================== Expo Modules ====================
-keep class expo.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Expo - Keep module registries
-keep class * implements expo.modules.core.interfaces.Package { *; }
-keep class * implements expo.modules.core.interfaces.InternalModule { *; }

# ==================== General ====================
# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
}

# ==================== R8 Missing Class Suppressions ====================
# Root Cause: @react-native-google-signin/google-signin depends on
# androidx.credentials (credential-manager), which transitively pulls in
# com.squareup:kotlinpoet as a runtime dependency. KotlinPoet is a
# compile-time code generation library that references javax.lang.model.*
# annotation processing API classes (Element, TypeMirror, TypeVisitor,
# SimpleTypeVisitor7). These javax.lang.model.* classes are part of the
# Java compiler environment and do NOT exist on Android runtime.
#
# Dependency chain:
#   @react-native-google-signin/google-signin
#     -> androidx.credentials:credentials (credential-manager)
#       -> com.squareup:kotlinpoet
#         -> javax.lang.model.element.Element
#         -> javax.lang.model.type.TypeMirror
#         -> javax.lang.model.type.TypeVisitor
#         -> javax.lang.model.util.SimpleTypeVisitor7
#
# These references are compile-time-only and are NEVER invoked at runtime.
# R8 correctly identifies them as missing classes, but they are safe to
# suppress with -dontwarn since the code paths that reference them are
# unreachable on Android. This is the standard, documented approach for
# handling annotation processing libraries that leak into runtime classpaths
# via transitive dependencies.
#
# This does NOT disable R8, ProGuard minification, or resource shrinking.
# It only suppresses warnings for classes that cannot and will not exist
# on Android runtime.
-dontwarn javax.lang.model.**
-dontwarn com.squareup.kotlinpoet.**

# ==================== EAS Build Workflow Note ====================
# expo-dev-client is listed in package.json for local development workflow.
# This does NOT affect production APK builds because EAS build profiles
# (preview and production in eas.json) use the "production" distribution
# channel which strips development-only dependencies and plugins.
# The expo-dev-client package is only active when developmentClient: true
# is set in the EAS build profile (used only in the "development" profile).
