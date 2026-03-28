// lightweight-charts-line-tools-price-range/src/views/LineToolPriceRangePaneView.ts

import {
	IChartApiBase,
	ISeriesApi,
	SeriesType,
	Coordinate,
	LineStyle,
} from 'lightweight-charts';

import {
	BaseLineTool,
	LineToolPaneView,
	CompositeRenderer,
	AnchorPoint,
	OffScreenState,
	getToolCullingState,
	LineToolOptionsInternal,
	TextRenderer,
	RectangleRenderer,
	SegmentRenderer,
	deepCopy,
	LineEnd,
	BoxVerticalAlignment,
	BoxHorizontalAlignment,
	PaneCursorType,
	TextAlignment,
	LineOptions,
	TextRendererData,
	LineToolPoint,
	LineToolCullingInfo,
	ensureNotNull
} from 'lightweight-charts-line-tools-core';

import { LineToolPriceRange } from '../model/LineToolPriceRange';


/**
 * Pane View for the Price Range tool.
 * 
 * TradingView-style implementation with:
 * 1. A Rectangle (the main body)
 * 2. A vertical arrow showing direction of price movement
 * 3. A label showing price change AND percentage (e.g., "-47.24 (-7.36%)")
 */
export class LineToolPriceRangePaneView<HorzScaleItem> extends LineToolPaneView<HorzScaleItem> {
	
	/**
	 * Internal renderer for the vertical arrow line.
	 * @protected
	 */
	protected _arrowLineRenderer: SegmentRenderer<HorzScaleItem> = new SegmentRenderer();
	
	/**
	 * Internal renderer specifically for the dynamic price difference label.
	 * @protected
	 */
	protected _priceDifferenceLabelRenderer: TextRenderer<HorzScaleItem> = new TextRenderer();

	/**
	 * Initializes the Price Range View.
	 */
	public constructor(
		source: LineToolPriceRange<HorzScaleItem>,
		chart: IChartApiBase<any>,
		series: ISeriesApi<SeriesType, any>,
	) {
		super(source as BaseLineTool<HorzScaleItem>, chart, series);
	}

	/**
	 * The core update logic - TradingView style.
	 */
	protected override _updateImpl(height: number, width: number): void {
		this._invalidated = false;
		this._renderer.clear();

		const tool = this._tool as LineToolPriceRange<HorzScaleItem>;
		const options = tool.options() as LineToolOptionsInternal<'PriceRange'>;
		
		if (!options.visible) {
			return;
		}

		// 1. Coordinate Conversion
		const hasScreenPoints = this._updatePoints();
		if (!hasScreenPoints || this._points.length < tool.pointsCount) {
			return;
		}

		const compositeRenderer = this._renderer as CompositeRenderer<HorzScaleItem>;
		const P0 = this._points[0];
		const P1 = this._points[1];

		// Ensure points are sorted for geometric calculations
		const minX = Math.min(P0.x, P1.x);
		const maxX = Math.max(P0.x, P1.x);
		const minY = Math.min(P0.y, P1.y);
		const maxY = Math.max(P0.y, P1.y);

		const topLeftScreen = new AnchorPoint(minX, minY, 0);
		const bottomRightScreen = new AnchorPoint(maxX, maxY, 1);
		
		// --- CULLING CHECK (disabled due to bug) ---
		const P0_cull = this._tool.getPoint(0)!;
		const P1_cull = this._tool.getPoint(1)!;

		if(false && P0_cull && P1_cull && this._points.length >= this._tool.pointsCount && !this._tool.isCreating() && !this._tool.isEditing()){
			// Culling logic disabled
		}

		// --- 1. Rectangle Body (no border - we draw top/bottom lines separately) ---
		const rectBodyPoints: [AnchorPoint, AnchorPoint] = [topLeftScreen, bottomRightScreen];
		
		const rectOptions = deepCopy(options.priceRange.rectangle);
		(rectOptions as any).border = null;
		
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
		const borderStyle = options.priceRange.rectangle.border?.style ?? LineStyle.Solid;

		const topLineRenderer = new SegmentRenderer<HorzScaleItem>();
		topLineRenderer.setData({
			points: [new AnchorPoint(minX, minY, 0), new AnchorPoint(maxX, minY, 1)],
			line: {
				color: borderColor,
				width: borderWidth,
				style: borderStyle,
				extend: { left: false, right: false },
				join: 'miter',
				cap: 'butt',
				end: { left: LineEnd.Normal, right: LineEnd.Normal },
			} as LineOptions,
		});
		compositeRenderer.append(topLineRenderer);

		const bottomLineRenderer = new SegmentRenderer<HorzScaleItem>();
		bottomLineRenderer.setData({
			points: [new AnchorPoint(minX, maxY, 0), new AnchorPoint(maxX, maxY, 1)],
			line: {
				color: borderColor,
				width: borderWidth,
				style: borderStyle,
				extend: { left: false, right: false },
				join: 'miter',
				cap: 'butt',
				end: { left: LineEnd.Normal, right: LineEnd.Normal },
			} as LineOptions,
		});
		compositeRenderer.append(bottomLineRenderer);

		// --- 2. Vertical Arrow (TradingView style) ---
		const activePoints = tool.points();
		if (activePoints.length >= 2) {
			const price0Raw = activePoints[0];
			const price1Raw = activePoints[1];
			const isUpward = price1Raw.price >= price0Raw.price;
			
			// Arrow in the center horizontally
			const midX = (minX + maxX) / 2 as Coordinate;
			
			// Arrow goes from start price to end price (shows direction)
			// In screen coords: if price went DOWN, arrow points down (minY to maxY)
			// If price went UP, arrow points up (maxY to minY)
			const arrowStart = new AnchorPoint(midX, isUpward ? maxY : minY, 0);
			const arrowEnd = new AnchorPoint(midX, isUpward ? minY : maxY, 1);
			
			// Get the border color from options for the arrow
			const arrowColor = options.priceRange.rectangle.border?.color || '#26a69a';
			
			this._arrowLineRenderer.setData({
				points: [arrowStart, arrowEnd],
				line: {
					color: arrowColor,
					width: 2,
					style: LineStyle.Solid,
					extend: { left: false, right: false },
					join: 'miter',
					cap: 'butt',
					end: {
						left: LineEnd.Normal,
						right: LineEnd.Arrow,  // Arrow at the end (direction of movement)
					},
				} as LineOptions,
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
	private _addPriceDifferenceLabel(
		renderer: CompositeRenderer<HorzScaleItem>,
		tool: LineToolPriceRange<HorzScaleItem>,
		P0: AnchorPoint,
		P1: AnchorPoint,
		isUpward: boolean,
		minX: number,
		maxX: number,
		minY: number,
		maxY: number,
	): void {
		const options = tool.options() as LineToolOptionsInternal<'PriceRange'>;
		const series = this._tool.getSeries();
		const priceRangeOptions = options.priceRange;

		const allActivePoints = tool.points();
		if (allActivePoints.length < 2) return;

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
		const priceDifferenceMagnitude = Math.abs(priceDifference);
		
		// Calculate percentage change
		const startPrice = P0_price_value;
		const percentageChange = startPrice !== 0 ? (priceDifference / startPrice) * 100 : 0;
		
		// Format the label like TradingView: "-47.24 (-7.36%)"
		const sign = priceDifference >= 0 ? '+' : '';
		const priceText = priceFormatter.format(priceDifference);
		const percentText = percentageChange.toFixed(2);
		const labelText = `${sign}${priceText} (${sign}${percentText}%)`;

		// Position: center-bottom of the box, slightly below
		const geometricCenterX = (minX + maxX) / 2 as Coordinate;
		// Place label at the END of the arrow (where price ended up)
		const labelY = isUpward ? minY : maxY;
		
		const labelPivot = new AnchorPoint(geometricCenterX, labelY as Coordinate, 0);

		// Get custom label options if provided
		const labelOptions = (priceRangeOptions as any).label || {};
		const labelColor = labelOptions.color || '#ffffff';
		const labelFontSize = labelOptions.fontSize || 12;

		// Prepare text options
		const finalLabelOptions = deepCopy(options.text);
		finalLabelOptions.value = labelText;
		
		// Position based on direction
		const placementVerticalAlignment = isUpward ? BoxVerticalAlignment.Top : BoxVerticalAlignment.Bottom;

		finalLabelOptions.box.alignment.horizontal = BoxHorizontalAlignment.Center;
		finalLabelOptions.box.alignment.vertical = placementVerticalAlignment;
		finalLabelOptions.alignment = TextAlignment.Center;
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

		const textRendererData: TextRendererData = {
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
	protected override _addAnchors(renderer: CompositeRenderer<any>): void {
		if (this._points.length < 2) return;

		const P0 = this._points[0];
		const P1 = this._points[1];

		// Point 0 (Start Corner)
		const anchor0 = new AnchorPoint(P0.x, P0.y, 0, false, this._getAnchorCursor(0));

		// Point 1 (End Corner)
		const anchor1 = new AnchorPoint(P1.x, P1.y, 1, false, this._getAnchorCursor(1));

		// Index 2: Uses P0 X (Time) and P1 Y (Price)
		const anchor2 = new AnchorPoint(P0.x, P1.y, 2, false, this._getAnchorCursor(2));

		// Index 3: Uses P1 X (Time) and P0 Y (Price)
		const anchor3 = new AnchorPoint(P1.x, P0.y, 3, false, this._getAnchorCursor(3));

		// Midpoints
		const midX = (P0.x + P1.x) / 2 as Coordinate;
		const midY = (P0.y + P1.y) / 2 as Coordinate;

		const anchor4 = new AnchorPoint(P0.x, midY, 4, true, PaneCursorType.HorizontalResize);
		const anchor5 = new AnchorPoint(P1.x, midY, 5, true, PaneCursorType.HorizontalResize);
		const anchor6 = new AnchorPoint(midX, P0.y, 6, true, PaneCursorType.VerticalResize);
		const anchor7 = new AnchorPoint(midX, P1.y, 7, true, PaneCursorType.VerticalResize);

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
	private _getAnchorCursor(index: number): PaneCursorType {
		const P0 = this._points[0];
		const P1 = this._points[1];
		
		const isRight = P1.x >= P0.x;
		const isDown = P1.y >= P0.y;

		const nwSe = PaneCursorType.DiagonalNwSeResize;
		const neSw = PaneCursorType.DiagonalNeSwResize;

		switch (index) {
			case 0:
			case 1:
				return (isRight === isDown) ? nwSe : neSw;
			case 2:
			case 3:
				return (isRight === isDown) ? neSw : nwSe;
			case 4:
			case 5:
				return PaneCursorType.HorizontalResize;
			case 6:
			case 7:
				return PaneCursorType.VerticalResize;
			default:
				return PaneCursorType.Move;
		}
	}	
}