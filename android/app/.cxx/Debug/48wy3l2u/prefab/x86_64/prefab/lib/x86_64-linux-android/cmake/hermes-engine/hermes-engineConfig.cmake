if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/shoebansari/.gradle/caches/9.0.0/transforms/c34392a9aee4ae0f6d6d64728bc6cf50/transformed/hermes-android-0.14.1-debug/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/shoebansari/.gradle/caches/9.0.0/transforms/c34392a9aee4ae0f6d6d64728bc6cf50/transformed/hermes-android-0.14.1-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

