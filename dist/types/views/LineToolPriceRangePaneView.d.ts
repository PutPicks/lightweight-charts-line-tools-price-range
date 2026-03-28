import { IChartApiBase, ISeriesApi, SeriesType } from 'lightweight-charts';
import { LineToolPaneView, CompositeRenderer, TextRenderer, SegmentRenderer } from 'lightweight-charts-line-tools-core';
import { LineToolPriceRange } from '../model/LineToolPriceRange';
/**
 * Pane View for the Price Range tool.
 *
 * TradingView-style implementation with:
 * 1. A Rectangle (the main body)
 * 2. A vertical arrow showing direction of price movement
 * 3. A label showing price change AND percentage (e.g., "-47.24 (-7.36%)")
 */
export declare class LineToolPriceRangePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {
    /**
     * Internal renderer for the vertical arrow line.
     * @protected
     */
    protected _arrowLineRenderer: SegmentRenderer<HorzScaleItem>;
    /**
     * Internal renderer specifically for the dynamic price difference label.
     * @protected
     */
    protected _priceDifferenceLabelRenderer: TextRenderer<HorzScaleItem>;
    /**
     * Initializes the Price Range View.
     */
    constructor(source: LineToolPriceRange<HorzScaleItem>, chart: IChartApiBase<any>, series: ISeriesApi<SeriesType, any>);
    /**
     * The core update logic - TradingView style.
     */
    protected _updateImpl(height: number, width: number): void;
    /**
     * Draws the price difference label with both dollar amount and percentage.
     * TradingView style: "-47.24 (-7.36%)"
     */
    private _addPriceDifferenceLabel;
    /**
     * Creates and adds the 8 interactive anchor points.
     */
    protected _addAnchors(renderer: CompositeRenderer<any>): void;
    /**
     * Determines the cursor for an anchor based on box orientation.
     */
    private _getAnchorCursor;
}
