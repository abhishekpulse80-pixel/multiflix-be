if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/shoebansari/.gradle/caches/9.0.0/transforms/0d6f1a26a83e8ba07d194c5e70038bbc/transformed/hermes-android-0.14.1-release/prefab/modules/hermesvm/libs/android.arm64-v8a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/shoebansari/.gradle/caches/9.0.0/transforms/0d6f1a26a83e8ba07d194c5e70038bbc/transformed/hermes-android-0.14.1-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

