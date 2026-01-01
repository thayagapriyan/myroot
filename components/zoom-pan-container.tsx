import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface ZoomPanContainerProps {
  children: React.ReactNode;
  contentWidth: number;
  contentHeight: number;
  containerWidth: number;
  containerHeight: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

interface ZoomPanContainerHandle {
  reset: () => void;
}

export const ZoomPanContainer = React.forwardRef<ZoomPanContainerHandle, ZoomPanContainerProps>(
  (
    {
      children,
      contentWidth,
      contentHeight,
      containerWidth,
      containerHeight,
      minZoom = 0.5,
      maxZoom = 3,
      onZoomChange,
    },
    ref
  ) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const resetZoomPan = useCallback(() => {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }, [scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY]);

    React.useImperativeHandle(ref, () => ({ reset: resetZoomPan }), [resetZoomPan]);

    const clampPan = (x: number, y: number, currentScale: number) => {
      'worklet';
      const scaledWidth = contentWidth * currentScale;
      const scaledHeight = contentHeight * currentScale;

      const maxPanX = Math.max(0, (scaledWidth - containerWidth) / 2);
      const maxPanY = Math.max(0, (scaledHeight - containerHeight) / 2);

      return {
        clampedX: Math.max(-maxPanX, Math.min(maxPanX, x)),
        clampedY: Math.max(-maxPanY, Math.min(maxPanY, y)),
      };
    };

    const pinchGesture = Gesture.Pinch()
      .onUpdate((event) => {
        const nextScale = savedScale.value * event.scale;
        scale.value = Math.max(minZoom, Math.min(maxZoom, nextScale));
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        if (onZoomChange) {
          runOnJS(onZoomChange)(scale.value);
        }
      });

    const panGesture = Gesture.Pan()
      .minPointers(2)
      .onUpdate((event) => {
        const { clampedX, clampedY } = clampPan(
          savedTranslateX.value + event.translationX,
          savedTranslateY.value + event.translationY,
          scale.value
        );
        translateX.value = clampedX;
        translateY.value = clampedY;
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
            width: containerWidth,
            height: containerHeight,
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
              <View style={{ width: contentWidth, height: contentHeight }}>
                {children}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    );
  }
);

ZoomPanContainer.displayName = 'ZoomPanContainer';
