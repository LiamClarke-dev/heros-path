# Production Testing Guide - Distance Calculation Fix

## Overview

Since you need to test outside your wifi range using production builds, I've created a visual debugging system that shows distance calculations directly in the UI. This eliminates the need for console logs.

## How to Enable Debug Mode

### Method 1: Triple-Tap the Map
1. **Open the app** and go to the map screen
2. **Triple-tap anywhere on the map** (tap 3 times quickly)
3. A **debug overlay** will appear in the top-right corner

### Method 2: Long-Press Debug Button
1. Look for a small **bug icon** in the top-right corner of the map
2. **Long-press the bug icon** to see instructions
3. **Single-tap the bug icon** to toggle the debug overlay

## What the Debug Overlay Shows

The debug overlay displays four key values:

### 🟢 **Status Indicator**
- **Green dot + "All distances match ✓"** = Fix is working correctly
- **Red dot + "Distance mismatch detected ⚠️"** = Issue still exists

### 📊 **Two-Stream Processing Values**
1. **Journey Distance**: Distance calculated from minimally filtered data (for statistics)
2. **Modal Distance**: Distance shown in the save modal (should match journey distance)
3. **Raw Points**: Total GPS coordinates received
4. **Journey Points**: Coordinates after minimal filtering (used for distance)
5. **Display Points**: Coordinates after heavy processing (used for map visualization)

## Testing Procedure

### Step 1: Start a Journey
1. Enable debug mode (triple-tap map)
2. Start tracking a journey
3. Walk for at least 100+ meters
4. Watch the debug overlay update in real-time

### Step 2: Check Real-Time Values
- **Journey Distance and Modal Distance should be identical**
- **Raw Points > Journey Points > Display Points** (normal filtering)
- **Status should show green "All distances match ✓"**
- **Journey Points should increase as you walk** (used for distance calculation)

### Step 3: Stop and Validate
1. Stop the journey
2. If journey is too short, you'll see validation modal
3. **Check that validation modal shows same distance as debug overlay**

### Step 4: Save Journey
1. Choose "Save Anyway" or continue until journey is long enough
2. In the save modal, **check that distance matches debug overlay**
3. **No more "0m distance" errors should occur**

## Expected Results (Fix Working)

✅ **Before Fix Issues (RESOLVED):**
- ~~Recording: 280m~~
- ~~Validation: 0m~~ 
- ~~Save Modal: 63m~~
- ~~Final Error: 0m~~

✅ **After Two-Stream Fix (Expected):**
- **Journey Distance: 280m** ✓ (accurate statistics)
- **Modal Distance: 280m** ✓ (matches journey)
- **Map Display: Smooth route** ✓ (processed for visualization)
- **Final Save: Success** ✓ (no more errors)

## Troubleshooting

### If Debug Overlay Doesn't Appear
1. Try triple-tapping the map again
2. Make sure you're tapping the map area, not UI controls
3. Look for the small bug icon in the top-right corner

### If Distances Still Don't Match
1. Take a screenshot of the debug overlay
2. Note which values are different
3. Check if the issue occurs consistently or intermittently

### If Journey Still Won't Save
1. Check the debug overlay values
2. Verify that "Modal" distance is not 0
3. Look for any error messages in the save process

## Debug Information Collected

The debug overlay shows:
- **Real-time distance calculations** using the centralized utils
- **Path data consistency** (number of GPS points)
- **Modal data flow** (what the save modal receives)
- **Visual confirmation** that all systems use the same calculation

## Disabling Debug Mode

- **Single-tap the debug overlay** to hide it
- **Triple-tap the map again** to toggle it back on
- The debug mode **doesn't affect app performance** or journey tracking

## What This Fixes

This visual debugging system allows you to verify that:

1. **All distance calculations use the same source** (`utils/distanceUtils.js`)
2. **Real-time tracking matches validation** (no more 0m errors)
3. **Save modal receives correct data** (no more incorrect distances)
4. **Journey saving works consistently** (no more validation failures)

## Next Steps

1. **Test with a real journey** outside wifi range
2. **Verify debug overlay shows matching values**
3. **Confirm journey saves successfully**
4. **Report back with results** or screenshots if issues persist

The debug overlay will give you complete visibility into the distance calculation flow without needing console access!