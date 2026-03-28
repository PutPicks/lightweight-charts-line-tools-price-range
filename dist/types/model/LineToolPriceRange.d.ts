import { IChartApiBase, ISeriesApi, IHorzScaleBehavior, SeriesType, Coordinate } from 'lightweight-charts';
import { BaseLineTool, LineToolPoint, LineToolType, LineToolOptionsInternal, Point, DeepPartial, LineToolsCorePlugin, PriceAxisLabelStackingManager, InteractionPhase, ConstraintResult, HitTestResult } from 'lightweight-charts-line-tools-core';
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
export declare const PriceRangeOptionDefaults: LineToolOptionsInternal<'PriceRange'>;
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
export declare class LineToolPriceRange<HorzScaleItem> extends BaseLineTool<HorzScaleItem> {
    /**
     * The unique identifier for this tool type ('PriceRange').
     *
     * @override
     */
    readonly toolType: LineToolType;
    /**
     * Defines the number of anchor points required to draw this tool.
     *
     * A Price Range is defined by exactly **2 points** (Start Corner and End Corner).
     *
     * @override
     */
    readonly pointsCount: number;
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
    maxAnchorIndex(): number;
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
    constructor(coreApi: LineToolsCorePlugin<HorzScaleItem>, chart: IChartApiBase<HorzScaleItem>, series: ISeriesApi<SeriesType, HorzScaleItem>, horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>, options: DeepPartial<LineToolOptionsInternal<"PriceRange">> | undefined, points: LineToolPoint[] | undefined, priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>);
    /**
     * Confirms that this tool can be created via the "Click-Click" method.
     *
     * @override
     * @returns `true`
     */
    supportsClickClickCreation(): boolean;
    /**
     * Confirms that this tool can be created via the "Click-Drag" method.
     *
     * @override
     * @returns `true`
     */
    supportsClickDragCreation(): boolean;
    /**
     * Enables geometric constraints (Shift key) during "Click-Click" creation.
     *
     * @override
     * @returns `true`
     */
    supportsShiftClickClickConstraint(): boolean;
    /**
     * Enables geometric constraints (Shift key) during "Click-Drag" creation.
     *
     * @override
     * @returns `true`
     */
    supportsShiftClickDragConstraint(): boolean;
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
    setPoint(index: number, point: LineToolPoint): void;
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
    getPoint(index: number): LineToolPoint | null;
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
    normalize(): void;
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
    getShiftConstrainedPoint(pointIndex: number, rawScreenPoint: Point, phase: InteractionPhase, originalLogicalPoint: LineToolPoint, allOriginalLogicalPoints: LineToolPoint[]): ConstraintResult;
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
    _internalHitTest(x: Coordinate, y: Coordinate): HitTestResult<any> | null;
}
