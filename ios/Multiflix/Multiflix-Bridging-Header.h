//
//  Multiflix-Bridging-Header.h
//  Exposes Objective-C pod headers to Swift (AppDelegate.swift).
//

// react-native-orientation-locker: lets the AppDelegate return the library's
// current orientation mask so lockToLandscape() can force rotation even when
// the device's rotation lock is ON (matching YouTube's behaviour).
#import <react-native-orientation-locker/Orientation.h>
