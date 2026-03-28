(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lightweight-charts'), require('lightweight-charts-line-tools-core')) :
    typeof define === 'function' && define.amd ? define(['exports', 'lightweight-charts', 'lightweight-charts-line-tools-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LightweightChartsLineToolsPriceRange = {}, global.LightweightCharts, global.LightweightChartsLineToolsCore));
})(this, (function (exports, lightweightCharts, lightweightChartsLineToolsCore) { 'use strict';

    // lightweight-charts-line-tools-price-range/src/views/LineToolPriceRangePaneView.ts
    /**
     * Pane View for the Price Range tool.
     *
     * TradingView-style implementation with:
     * 1. A Rectangle (the main body)
     * 2. A vertical arrow showing direction of price movement
     * 3. A label showing price change AND percentage (e.g., "-47.24 (-7.36%)")
     */
    class LineToolPriceRangePaneView extends lightweightChartsLineToolsCore.LineToolPaneView {
        /**
         * Initializes the Price Range View.
         */
        constructor(source, chart, series) {
            super(source, chart, series);
            /**
             * Internal renderer for the vertical arrow line.
             * @protected
             */
            this._arrowLineRenderer = new lightweightChartsLineToolsCore.SegmentRenderer();
            /**
             * Internal renderer specifically for the dynamic price difference label.
             * @protected
             */
            this._priceDifferenceLabelRenderer = new lightweightChartsLineToolsCore.TextRenderer();
        }
        /**
         * The core update logic - TradingView style.
         */
        _updateImpl(height, width) {
            this._invalidated = false;
            this._renderer.clear();
            const tool = this._tool;
            const options = tool.options();
            if (!options.visible) {
                return;
            }
            // 1. Coordinate Conversion
            const hasScreenPoints = this._updatePoints();
            if (!hasScreenPoints || this._points.length < tool.pointsCount) {
                return;
            }
            const compositeRenderer = this._renderer;
            const P0 = this._points[0];
            const P1 = this._points[1];
            // Ensure points are sorted for geometric calculations
            const minX = Math.min(P0.x, P1.x);
            const maxX = Math.max(P0.x, P1.x);
            const minY = Math.min(P0.y, P1.y);
            const maxY = Math.max(P0.y, P1.y);
            const topLeftScreen = new lightweightChartsLineToolsCore.AnchorPoint(minX, minY, 0);
            const bottomRightScreen = new lightweightChartsLineToolsCore.AnchorPoint(maxX, maxY, 1);
            // --- CULLING CHECK (disabled due to bug) ---
            this._tool.getPoint(0);
            this._tool.getPoint(1);
            // --- 1. Rectangle Body (no border - we draw top/bottom lines separately) ---
            const rectBodyPoints = [topLeftScreen, bottomRightScreen];
            const rectOptions = lightweightChartsLineToolsCore.deepCopy(options.priceRange.rectangle);
            rectOptions.border = null;
            this._rectangleRenderer.setData({
                ...rectOptions,
                points: rectBodyPoints,
                hitTestBackground: true,
                toolDefaultHoverCursor: options.defaultHoverCursor,
                toolDefaultDragCursor: options.defaultDragCursor,
            });
            compositeRenderer.append(this._rectangleRenderer);
            // --- 1b. Top and Bottom border lines only ---
            const borderColor = options.priceRange.rectangle.border?.color || '#2196F3';
            const borderWidth = options.priceRange.rectangle.border?.width || 2;
            const borderStyle = options.priceRange.rectangle.border?.style ?? lightweightCharts.LineStyle.Solid;
            const topLineRenderer = new lightweightChartsLineToolsCore.SegmentRenderer();
            topLineRenderer.setData({
                points: [new lightweightChartsLineToolsCore.AnchorPoint(minX, minY, 0), new lightweightChartsLineToolsCore.AnchorPoint(maxX, minY, 1)],
                line: {
                    color: borderColor,
                    width: borderWidth,
                    style: borderStyle,
                    extend: { left: false, right: false },
                    join: 'miter',
                    cap: 'butt',
                    end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                },
            });
            compositeRenderer.append(topLineRenderer);
            const bottomLineRenderer = new lightweightChartsLineToolsCore.SegmentRenderer();
            bottomLineRenderer.setData({
                points: [new lightweightChartsLineToolsCore.AnchorPoint(minX, maxY, 0), new lightweightChartsLineToolsCore.AnchorPoint(maxX, maxY, 1)],
                line: {
                    color: borderColor,
                    width: borderWidth,
                    style: borderStyle,
                    extend: { left: false, right: false },
                    join: 'miter',
                    cap: 'butt',
                    end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                },
            });
            compositeRenderer.append(bottomLineRenderer);
            // --- 2. Vertical Arrow (TradingView style) ---
            const activePoints = tool.points();
            if (activePoints.length >= 2) {
                const price0Raw = activePoints[0];
                const price1Raw = activePoints[1];
                const isUpward = price1Raw.price >= price0Raw.price;
                // Arrow in the center horizontally
                const midX = (minX + maxX) / 2;
                // Arrow goes from start price to end price (shows direction)
                // In screen coords: if price went DOWN, arrow points down (minY to maxY)
                // If price went UP, arrow points up (maxY to minY)
                const arrowStart = new lightweightChartsLineToolsCore.AnchorPoint(midX, isUpward ? maxY : minY, 0);
                const arrowEnd = new lightweightChartsLineToolsCore.AnchorPoint(midX, isUpward ? minY : maxY, 1);
                // Get the border color from options for the arrow
                const arrowColor = options.priceRange.rectangle.border?.color || '#26a69a';
                this._arrowLineRenderer.setData({
                    points: [arrowStart, arrowEnd],
                    line: {
                        color: arrowColor,
                        width: 2,
                        style: lightweightCharts.LineStyle.Solid,
                        extend: { left: false, right: false },
                        join: 'miter',
                        cap: 'butt',
                        end: {
                            left: lightweightChartsLineToolsCore.LineEnd.Normal,
                            right: lightweightChartsLineToolsCore.LineEnd.Arrow, // Arrow at the end (direction of movement)
                        },
                    },
                });
                compositeRenderer.append(this._arrowLineRenderer);
                // --- 3. Price + Percentage Label ---
                this._addPriceDifferenceLabel(compositeRenderer, tool, P0, P1, isUpward, minX, maxX, minY, maxY);
            }
            // --- 4. Anchors ---
            this._addAnchors(compositeRenderer);
        }
        /**
         * Draws the price difference label with both dollar amount and percentage.
         * TradingView style: "-47.24 (-7.36%)"
         */
        _addPriceDifferenceLabel(renderer, tool, P0, P1, isUpward, minX, maxX, minY, maxY) {
            const options = tool.options();
            const series = this._tool.getSeries();
            const priceRangeOptions = options.priceRange;
            const allActivePoints = tool.points();
            if (allActivePoints.length < 2)
                return;
            const price0Raw = allActivePoints[0];
            const price1Raw = allActivePoints[1];
            // Check visibility options
            const showLabel = isUpward ? priceRangeOptions.showTopPrice : priceRangeOptions.showBottomPrice;
            if (!showLabel) {
                return;
            }
            // Get the price formatter
            const priceFormatter = series.priceFormatter();
            // Get formatted price values
            const P0_price_value = parseFloat(priceFormatter.format(price0Raw.price));
            const P1_price_value = parseFloat(priceFormatter.format(price1Raw.price));
            // Calculate price difference (signed)
            const priceDifference = P1_price_value - P0_price_value;
            // Calculate percentage change
            const startPrice = P0_price_value;
            const percentageChange = startPrice !== 0 ? (priceDifference / startPrice) * 100 : 0;
            // Format the label like TradingView: "-47.24 (-7.36%)"
            const sign = priceDifference >= 0 ? '+' : '';
            const priceText = priceFormatter.format(priceDifference);
            const percentText = percentageChange.toFixed(2);
            const labelText = `${sign}${priceText} (${sign}${percentText}%)`;
            // Position: center-bottom of the box, slightly below
            const geometricCenterX = (minX + maxX) / 2;
            // Place label at the END of the arrow (where price ended up)
            const labelY = isUpward ? minY : maxY;
            const labelPivot = new lightweightChartsLineToolsCore.AnchorPoint(geometricCenterX, labelY, 0);
            // Get custom label options if provided
            const labelOptions = priceRangeOptions.label || {};
            const labelColor = labelOptions.color || '#ffffff';
            const labelFontSize = labelOptions.fontSize || 12;
            // Prepare text options
            const finalLabelOptions = lightweightChartsLineToolsCore.deepCopy(options.text);
            finalLabelOptions.value = labelText;
            // Position based on direction
            const placementVerticalAlignment = isUpward ? lightweightChartsLineToolsCore.BoxVerticalAlignment.Top : lightweightChartsLineToolsCore.BoxVerticalAlignment.Bottom;
            finalLabelOptions.box.alignment.horizontal = lightweightChartsLineToolsCore.BoxHorizontalAlignment.Center;
            finalLabelOptions.box.alignment.vertical = placementVerticalAlignment;
            finalLabelOptions.alignment = lightweightChartsLineToolsCore.TextAlignment.Center;
            finalLabelOptions.font.size = labelFontSize;
            finalLabelOptions.font.bold = true;
            finalLabelOptions.font.color = labelColor;
            // Offset to push label outside the box
            finalLabelOptions.box.offset = { x: 0, y: isUpward ? -20 : 20 };
            // Make background semi-transparent or match the box
            finalLabelOptions.box.background = {
                color: 'rgba(0, 0, 0, 0.7)',
                inflation: { x: 4, y: 2 }
            };
            const textRendererData = {
                points: [labelPivot],
                text: finalLabelOptions,
                hitTestBackground: true,
            };
            this._priceDifferenceLabelRenderer.setData(textRendererData);
            renderer.append(this._priceDifferenceLabelRenderer);
        }
        /**
         * Creates and adds the 8 interactive anchor points.
         */
        _addAnchors(renderer) {
            if (this._points.length < 2)
                return;
            const P0 = this._points[0];
            const P1 = this._points[1];
            // Point 0 (Start Corner)
            const anchor0 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, P0.y, 0, false, this._getAnchorCursor(0));
            // Point 1 (End Corner)
            const anchor1 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, P1.y, 1, false, this._getAnchorCursor(1));
            // Index 2: Uses P0 X (Time) and P1 Y (Price)
            const anchor2 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, P1.y, 2, false, this._getAnchorCursor(2));
            // Index 3: Uses P1 X (Time) and P0 Y (Price)
            const anchor3 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, P0.y, 3, false, this._getAnchorCursor(3));
            // Midpoints
            const midX = (P0.x + P1.x) / 2;
            const midY = (P0.y + P1.y) / 2;
            const anchor4 = new lightweightChartsLineToolsCore.AnchorPoint(P0.x, midY, 4, true, lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize);
            const anchor5 = new lightweightChartsLineToolsCore.AnchorPoint(P1.x, midY, 5, true, lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize);
            const anchor6 = new lightweightChartsLineToolsCore.AnchorPoint(midX, P0.y, 6, true, lightweightChartsLineToolsCore.PaneCursorType.VerticalResize);
            const anchor7 = new lightweightChartsLineToolsCore.AnchorPoint(midX, P1.y, 7, true, lightweightChartsLineToolsCore.PaneCursorType.VerticalResize);
            const anchorData = {
                points: [
                    anchor0, anchor1, anchor2, anchor3,
                    anchor4, anchor5, anchor6, anchor7
                ],
            };
            const toolOptions = this._tool.options();
            renderer.append(this.createLineAnchor({
                ...anchorData,
                defaultAnchorHoverCursor: toolOptions.defaultAnchorHoverCursor,
                defaultAnchorDragCursor: toolOptions.defaultAnchorDragCursor,
            }, 0));
        }
        /**
         * Determines the cursor for an anchor based on box orientation.
         */
        _getAnchorCursor(index) {
            const P0 = this._points[0];
            const P1 = this._points[1];
            const isRight = P1.x >= P0.x;
            const isDown = P1.y >= P0.y;
            const nwSe = lightweightChartsLineToolsCore.PaneCursorType.DiagonalNwSeResize;
            const neSw = lightweightChartsLineToolsCore.PaneCursorType.DiagonalNeSwResize;
            switch (index) {
                case 0:
                case 1:
                    return (isRight === isDown) ? nwSe : neSw;
                case 2:
                case 3:
                    return (isRight === isDown) ? neSw : nwSe;
                case 4:
                case 5:
                    return lightweightChartsLineToolsCore.PaneCursorType.HorizontalResize;
                case 6:
                case 7:
                    return lightweightChartsLineToolsCore.PaneCursorType.VerticalResize;
                default:
                    return lightweightChartsLineToolsCore.PaneCursorType.Move;
            }
        }
    }

    // lightweight-charts-line-tools-price-range/src/model/LineToolPriceRange.ts
    /**
     * Defines the default configuration options for the Price Range tool.
     *
     * **Tutorial Note:**
     * This tool is visually complex, composed of multiple parts:
     * 1. **Rectangle:** The main body (`priceRange.rectangle`), usually semi-transparent.
     * 2. **Center Lines:** Optional Horizontal/Vertical lines (`priceRange.horizontalLine`, `verticalLine`) to mark the midpoint.
     * 3. **Labels:** A dynamic price difference label calculated in the view, plus an optional user text box.
     *
     * The defaults configure the specific styling (colors, dashed lines) for all these sub-components.
     */
    const PriceRangeOptionDefaults = {
        visible: true,
        editable: true,
        defaultHoverCursor: lightweightChartsLineToolsCore.PaneCursorType.Pointer,
        defaultDragCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
        defaultAnchorHoverCursor: lightweightChartsLineToolsCore.PaneCursorType.Pointer,
        defaultAnchorDragCursor: lightweightChartsLineToolsCore.PaneCursorType.Grabbing,
        notEditableCursor: lightweightChartsLineToolsCore.PaneCursorType.NotAllowed,
        showPriceAxisLabels: true,
        showTimeAxisLabels: true,
        priceAxisLabelAlwaysVisible: false,
        timeAxisLabelAlwaysVisible: false,
        // --- 1. Top-level 'text' property (common to Rectangle/TrendLine pattern) ---
        text: {
            value: '', // Default value
            padding: 0,
            wordWrapWidth: 0,
            forceTextAlign: false,
            forceCalculateMaxLineWidth: false,
            alignment: lightweightChartsLineToolsCore.TextAlignment.Center,
            font: {
                color: 'rgba(255, 255, 255, 1)',
                size: 12,
                bold: false,
                italic: false,
                family: 'sans-serif',
            },
            box: {
                alignment: { vertical: lightweightChartsLineToolsCore.BoxVerticalAlignment.Middle, horizontal: lightweightChartsLineToolsCore.BoxHorizontalAlignment.Center },
                angle: 0,
                scale: 1,
                padding: { x: 0, y: 0 },
                maxHeight: 0, // Placeholder
                shadow: { blur: 0, color: 'transparent', offset: { x: 0, y: 0 } },
                border: { color: 'transparent', width: 0, radius: 0, highlight: false, style: lightweightCharts.LineStyle.Solid },
                background: { color: 'transparent', inflation: { x: 0, y: 0 } },
            },
        }, // Casting is fine here
        // --- 2. Required NESTING: Top-level 'priceRange' property holding the structural options ---
        priceRange: {
            rectangle: {
                extend: { left: false, right: false },
                background: { color: 'rgba(156,39,176,0.2)' },
                border: { width: 1, style: lightweightCharts.LineStyle.Solid, color: '#9c27b0', radius: 0 },
            },
            verticalLine: {
                width: 1,
                color: '#9c27b0',
                style: lightweightCharts.LineStyle.Solid,
                join: 'miter',
                cap: 'butt',
                end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                extend: { left: false, right: false },
            }, // Casting is necessary
            horizontalLine: {
                width: 1,
                color: '#9c27b0',
                style: lightweightCharts.LineStyle.Dashed,
                join: 'miter',
                cap: 'butt',
                end: { left: lightweightChartsLineToolsCore.LineEnd.Normal, right: lightweightChartsLineToolsCore.LineEnd.Normal },
                extend: { left: false, right: false },
            },
            showCenterHorizontalLine: true,
            showCenterVerticalLine: true,
            showTopPrice: true,
            showBottomPrice: true,
            // Custom label styling
            label: {
                color: '#ffffff',
                fontSize: 12,
            },
        }
    };
    /**
     * Concrete implementation of the Price Range drawing tool.
     *
     * **What is a Price Range Tool?**
     * It is defined by **2 points** (P0, P1) forming a rectangle.
     * Unlike a simple Rectangle tool, this tool is specialized to calculate and display
     * the vertical price difference (absolute and/or percentage) between the two points.
     *
     * **Complex Interaction:**
     * This class implements advanced resizing logic using **8 Anchors** (2 real, 6 virtual).
     * This allows the user to resize specific edges (e.g., "Top Edge only") or corners,
     * providing a standard drawing software experience.
     */
    class LineToolPriceRange extends lightweightChartsLineToolsCore.BaseLineTool {
        /**
         * Explicitly defines the highest valid index for an interactive anchor point.
         *
         * The Price Range tool supports 8 distinct handles:
         * - **0-1:** The actual corners (P0, P1).
         * - **2-3:** The virtual corners (Top-Right / Bottom-Left).
         * - **4-7:** The edge midpoints (Top, Bottom, Left, Right).
         *
         * Returning `7` ensures the Interaction Manager tracks drag events for all of them.
         *
         * @override
         * @returns `7`
         */
        maxAnchorIndex() {
            return 7; // 8 anchors total (corners and midpoints)
        }
        /**
         * Initializes the Price Range tool.
         *
         * **Tutorial Note on Construction:**
         * 1. **Base Defaults:** Uses `PriceRangeOptionDefaults` which includes the nested `priceRange` config.
         * 2. **User Options:** Merges user provided settings.
         * 3. **View:** Assigns `LineToolPriceRangePaneView`, which handles the rendering of the multi-part visual
         *    (rectangle, crosshairs, dynamic labels).
         *
         * @param coreApi - The Core Plugin API.
         * @param chart - The Lightweight Charts Chart API.
         * @param series - The Series API this tool is attached to.
         * @param horzScaleBehavior - The horizontal scale behavior.
         * @param options - Configuration overrides.
         * @param points - Initial points.
         * @param priceAxisLabelStackingManager - The manager for label collision.
         */
        constructor(coreApi, chart, series, horzScaleBehavior, options = {}, points = [], priceAxisLabelStackingManager) {
            const finalOptions = lightweightChartsLineToolsCore.deepCopy(PriceRangeOptionDefaults);
            lightweightChartsLineToolsCore.merge(finalOptions, options);
            super(coreApi, chart, series, horzScaleBehavior, finalOptions, points, 'PriceRange', 2, priceAxisLabelStackingManager);
            /**
             * The unique identifier for this tool type ('PriceRange').
             *
             * @override
             */
            this.toolType = 'PriceRange';
            /**
             * Defines the number of anchor points required to draw this tool.
             *
             * A Price Range is defined by exactly **2 points** (Start Corner and End Corner).
             *
             * @override
             */
            this.pointsCount = 2;
            this._setPaneViews([new LineToolPriceRangePaneView(this, this._chart, this._series)]);
        }
        /**
         * Confirms that this tool can be created via the "Click-Click" method.
         *
         * @override
         * @returns `true`
         */
        supportsClickClickCreation() {
            return true; // Rectangle supports click-click creation
        }
        /**
         * Confirms that this tool can be created via the "Click-Drag" method.
         *
         * @override
         * @returns `true`
         */
        supportsClickDragCreation() {
            return true; // Rectangle supports click-drag creation
        }
        /**
         * Enables geometric constraints (Shift key) during "Click-Click" creation.
         *
         * @override
         * @returns `true`
         */
        supportsShiftClickClickConstraint() {
            return true; // Rectangle supports Shift constraint during click-click creation
        }
        /**
         * Enables geometric constraints (Shift key) during "Click-Drag" creation.
         *
         * @override
         * @returns `true`
         */
        supportsShiftClickDragConstraint() {
            return true; // Rectangle supports Shift constraint during click-drag creation
        }
        /**
         * Handles complex resize logic for the 8 specific anchor points.
         *
         * **Tutorial Note on Virtual Anchors:**
         * When a user drags a virtual anchor (like the "Top Edge"), we don't just move a point.
         * We act as if the user is resizing the bounding box in a specific direction.
         *
         * - **Indices 0-1:** Standard update of P0/P1.
         * - **Indices 2-3 (Virtual Corners):** We update a mix of P0 and P1 coordinates (e.g., drag TR updates P0.y and P1.x).
         * - **Indices 4-7 (Edges):** We constrain the update to a single axis (e.g., drag Top Edge only updates P0.y).
         *
         * @param index - The index of the anchor being dragged (0-7).
         * @param point - The new logical position.
         * @override
         */
        setPoint(index, point) {
            // If primary points (0 or 1) are being set, use the base implementation.
            if (index < 2) {
                super.setPoint(index, point);
                return;
            }
            // Handle movement of the 6 virtual anchors (2-7).
            // We avoid complex geometric checks and allow the points to cross over,
            // relying on the normalize() function to resolve the geometric stability later.
            const P0 = this._points[0];
            const P1 = this._points[1];
            switch (index) {
                // --- Corner Anchors (Invert freely) ---
                case 2: // Bottom-Left (BL): P0 time/P1 price
                    P0.timestamp = point.timestamp;
                    P1.price = point.price;
                    break;
                case 3: // Top-Right (TR): P0 price/P1 time
                    P0.price = point.price;
                    P1.timestamp = point.timestamp;
                    break;
                // --- Side Anchors (Single-Axis Movement) ---
                case 4: // Middle-Left (ML): Only changes P0's time component (horizontal resize)
                    P0.timestamp = point.timestamp;
                    break;
                case 5: // Middle-Right (MR): Only changes P1's time component (horizontal resize)
                    P1.timestamp = point.timestamp;
                    break;
                case 6: // Top-Center (TC): Only changes P0's price component (vertical resize)
                    P0.price = point.price;
                    break;
                case 7: // Bottom-Center (BC): Only changes P1's price component (vertical resize)
                    P1.price = point.price;
                    break;
            }
            this._triggerChartUpdate();
        }
        /**
         * Calculates the logical position for any of the 8 anchors.
         *
         * **Logic:**
         * - **0-1:** Returns the stored points P0, P1.
         * - **2-3:** Returns synthesized corners (e.g., { P0.x, P1.y }).
         * - **4-7:** Returns synthesized edge midpoints (e.g., Average(P0.x, P1.x), P0.y).
         *
         * This allows the `LineAnchorRenderer` to draw handles at locations that don't technically exist
         * in the `_points` array.
         *
         * @param index - The anchor index.
         * @returns The calculated {@link LineToolPoint}, or `null`.
         * @override
         */
        getPoint(index) {
            if (this._points.length < 2) {
                return super.getPoint(index);
            }
            const P0 = this._points[0]; // Start
            const P1 = this._points[1]; // End
            // Calculate purely mathematical midpoint
            const midPrice = (P0.price + P1.price) / 2;
            // ERROR FIX: Remove 'as Time'. Keep it as a number.
            // We use Math.round to ensure the timestamp remains an integer (if required by your specific scale configuration)
            // but raw division is usually accepted by the type definition.
            const midTime = (P0.timestamp + P1.timestamp) / 2;
            switch (index) {
                // Primary Anchors
                case 0: return P0; // Start
                case 1: return P1; // End
                // Corner Anchors (Topology: X from one, Y from the other)
                case 2: return { price: P1.price, timestamp: P0.timestamp }; // P0 Time, P1 Price
                case 3: return { price: P0.price, timestamp: P1.timestamp }; // P1 Time, P0 Price
                // Side Anchors (Topology: One fixed axis, one Midpoint)
                case 4: return { price: midPrice, timestamp: P0.timestamp }; // Left/Right (P0 Time)
                case 5: return { price: midPrice, timestamp: P1.timestamp }; // Left/Right (P1 Time)
                case 6: return { price: P0.price, timestamp: midTime }; // Top/Bottom (P0 Price)
                case 7: return { price: P1.price, timestamp: midTime }; // Top/Bottom (P1 Price)
                default: return null;
            }
        }
        /**
         * Intentionally empty override.
         *
         * **Why?**
         * The Price Range tool relies on the specific relationship between P0 and P1 to determine direction (Up/Down).
         * Normalizing (sorting by time/price) could flip P0 and P1, inverting the calculated "direction"
         * (Positive/Negative price change) and confusing the anchor drag logic implemented in `setPoint`.
         *
         * @override
         */
        normalize() {
        }
        /**
         * Implements granular Shift constraint logic for the 8 different anchor types.
         *
         * **Tutorial Note:**
         * The behavior of "Shift" depends on *what* you are dragging:
         * 1. **Creation:** Standard lock (Force Horizontal/Vertical relative to start).
         * 2. **Edge Anchors (4-7):** Already locked to one axis by definition, so Shift might force a specific coordinate alignment.
         * 3. **Corner Anchors (0-3):** Compares the delta X vs delta Y from the *opposing* corner.
         *    - If dragging more Horizontal, lock Price (Horizontal Line).
         *    - If dragging more Vertical, lock Time (Vertical Line).
         *
         * @param pointIndex - The anchor index.
         * @param rawScreenPoint - Mouse position.
         * @param phase - Creation or Editing.
         * @param originalLogicalPoint - Starting position of the drag.
         * @param allOriginalLogicalPoints - Snapshot of all points.
         * @returns The constrained result.
         * @override
         */
        getShiftConstrainedPoint(pointIndex, rawScreenPoint, phase, originalLogicalPoint, allOriginalLogicalPoints) {
            // 1. Get the screen coordinate of the anchor being dragged BEFORE it moved.
            const originalScreenPoint = this.pointToScreenPoint(originalLogicalPoint);
            if (!originalScreenPoint) {
                return { point: rawScreenPoint, snapAxis: 'none' };
            }
            // --- Creation Phase ---
            if (phase === lightweightChartsLineToolsCore.InteractionPhase.Creation) {
                // Standard: Lock to produce a straight horizontal line
                const P0_logical = allOriginalLogicalPoints[0];
                const P0_screen = this.pointToScreenPoint(P0_logical);
                return {
                    point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, P0_screen.y),
                    snapAxis: 'price',
                };
            }
            // --- Editing Phase ---
            // 1. Side Resizers (4, 5, 6, 7)
            // These should effectively ignore Shift (or always apply it), 
            // because a side anchor only has one degree of freedom anyway.
            if (pointIndex === 4 || pointIndex === 5) { // Vertical Lines (Move Horizontal)
                return {
                    point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                    snapAxis: 'price', // Snap Price (Keep Y constant)
                };
            }
            if (pointIndex === 6 || pointIndex === 7) { // Horizontal Lines (Move Vertical)
                return {
                    point: new lightweightChartsLineToolsCore.Point(originalScreenPoint.x, rawScreenPoint.y),
                    snapAxis: 'time', // Snap Time (Keep X constant)
                };
            }
            // 2. Corner Resizers (0, 1, 2, 3)
            // When holding Shift on a corner, usually we want to lock to EITHER vertical OR horizontal
            // relative to the opposing anchor.
            // Find the opposing anchor index to determine the pivot point
            // 0(Start) <-> 1(End)
            // 2(P0x,P1y) <-> 3(P1x,P0y)
            let opposingIndex = -1;
            if (pointIndex === 0)
                opposingIndex = 1;
            else if (pointIndex === 1)
                opposingIndex = 0;
            else if (pointIndex === 2)
                opposingIndex = 3;
            else if (pointIndex === 3)
                opposingIndex = 2;
            const opposingLogical = allOriginalLogicalPoints[opposingIndex];
            const opposingScreen = this.pointToScreenPoint(opposingLogical);
            if (opposingScreen) {
                // Calculate delta from the pivot (opposing corner)
                const dx = Math.abs(rawScreenPoint.x - opposingScreen.x);
                const dy = Math.abs(rawScreenPoint.y - opposingScreen.y);
                // If X delta is bigger, lock Y (Horizontal Move). If Y delta bigger, lock X (Vertical Move).
                if (dx > dy) {
                    return {
                        point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                        snapAxis: 'price',
                    };
                }
                else {
                    return {
                        point: new lightweightChartsLineToolsCore.Point(originalScreenPoint.x, rawScreenPoint.y),
                        snapAxis: 'time',
                    };
                }
            }
            // Fallback: Just lock Y if we can't calculate opposing (matches previous logic)
            return {
                point: new lightweightChartsLineToolsCore.Point(rawScreenPoint.x, originalScreenPoint.y),
                snapAxis: 'price',
            };
        }
        /**
         * Performs the hit test for the Price Range tool.
         *
         * **Architecture Note:**
         * Delegates to the `LineToolPriceRangePaneView`. The view uses a `CompositeRenderer` containing:
         * 1. `RectangleRenderer` (Body/Borders).
         * 2. `SegmentRenderer` (Center lines).
         * 3. `TextRenderer` (Labels).
         *
         * Delegating ensures that hitting *any* of these visual components registers as selecting the tool.
         *
         * @param x - X coordinate.
         * @param y - Y coordinate.
         * @returns A hit result, or `null`.
         * @override
         */
        _internalHitTest(x, y) {
            if (!this._paneViews || this._paneViews.length === 0) {
                return null;
            }
            const paneView = this._paneViews[0];
            const compositeRenderer = paneView.renderer();
            if (!compositeRenderer || !compositeRenderer.hitTest) {
                return null;
            }
            // The Pane View's renderer is a CompositeRenderer, which delegates the hit-test
            return compositeRenderer.hitTest(x, y);
        }
    }

    // lightweight-charts-line-tools-price-range/src/index.ts
    // Define the name under which this specific tool will be registered
    const PRICE_RANGE_LINE_NAME = 'PriceRange';
    /**
     * Registers the Price Range tool with the provided Core Plugin instance.
     *
     * @param corePlugin - The instance of the Core Line Tools Plugin.
     * @returns void
     *
     * @example
     * ```ts
     * registerPriceRangePlugin(corePlugin);
     * ```
     */
    function registerPriceRangePlugin(corePlugin) {
        // Register the PriceRange Tool
        // We pass the specific name and the class constructor.
        corePlugin.registerLineTool(PRICE_RANGE_LINE_NAME, LineToolPriceRange);
        console.log(`Registered Line Tool: ${PRICE_RANGE_LINE_NAME}`);
    }

    exports.LineToolPriceRange = LineToolPriceRange;
    exports.default = registerPriceRangePlugin;
    exports.registerPriceRangePlugin = registerPriceRangePlugin;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=lightweight-charts-line-tools-price-range.umd.js.map
