# Keep Capacitor Bridge and Plugin classes from obfuscation in Release APK builds
-keep class com.getcapacitor.** { *; }
-keep class com.sazai.workspace.** { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-dontwarn android.webkit.**
