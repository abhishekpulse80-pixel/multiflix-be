import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Required by @react-native-firebase/app — reads GoogleService-Info.plist.
    FirebaseApp.configure()

    // Auto-hide the iOS home indicator while the UI is in landscape
    // (i.e. the fullscreen video player). See the UIViewController extension.
    UIViewController.mfx_swizzleHomeIndicator()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Multiflix",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // Hand the supported-orientation decision to react-native-orientation-locker.
  // When JS calls Orientation.lockToLandscape() the library narrows this mask to
  // landscape, so iOS rotates the player even while the device's rotation lock is
  // on (the same way YouTube forces landscape). Defaults to the app's Info.plist
  // orientations the rest of the time.
  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    // NOTE: keep this method side-effect free. Triggering any view/appearance
    // update here (e.g. setNeedsUpdateOfHomeIndicatorAutoHidden) interferes
    // with react-native-orientation-locker's in-progress rotation and cancels
    // it. iOS re-queries prefersHomeIndicatorAutoHidden on rotation anyway.
    return Orientation.getOrientation()
  }
}

// MARK: - Home indicator auto-hide (landscape / fullscreen video)

extension UIViewController {
  /// Replacement getter swapped in for `prefersHomeIndicatorAutoHidden` via
  /// swizzling. Hides the home indicator when the UI is in landscape — which,
  /// for this otherwise-portrait app, means the fullscreen blog/video player.
  @objc dynamic var mfx_prefersHomeIndicatorAutoHidden: Bool {
    return view.window?.windowScene?.interfaceOrientation.isLandscape ?? false
  }

  /// Swap `prefersHomeIndicatorAutoHidden` for `mfx_…` once at launch.
  static func mfx_swizzleHomeIndicator() {
    guard
      let original = class_getInstanceMethod(
        UIViewController.self,
        #selector(getter: UIViewController.prefersHomeIndicatorAutoHidden)
      ),
      let replacement = class_getInstanceMethod(
        UIViewController.self,
        #selector(getter: UIViewController.mfx_prefersHomeIndicatorAutoHidden)
      )
    else { return }
    method_exchangeImplementations(original, replacement)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
