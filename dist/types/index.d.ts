/**
 * This is the main entry point for the 'lightweight-charts-line-tools-price-range' plugin.
 * It exports the LineToolPriceRange class for registration with the core line tools plugin.
 */
import { ILineToolsPlugin } from 'lightweight-charts-line-tools-core';
import { LineToolPriceRange } from './model/LineToolPriceRange';
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
export declare function registerPriceRangePlugin<HorzScaleItem>(corePlugin: ILineToolsPlugin & {
    registerLineTool: <H>(type: string, toolClass: new (...args: any[]) => any) => void;
}): void;
export { LineToolPriceRange };
export default registerPriceRangePlugin;
