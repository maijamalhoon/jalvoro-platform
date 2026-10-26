package com.jamalsfinance.nativeapp.ui

/** Nullable-safe counterpart used for public shared-model text fields. */
internal fun String?.takeLast(count: Int): String = orEmpty().let { value ->
    if (count <= 0) "" else value.substring((value.length - count).coerceAtLeast(0))
}
