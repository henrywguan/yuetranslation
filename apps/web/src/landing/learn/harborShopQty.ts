/** RS bank / general-store qty toggles. */
export const HARBOR_SHOP_QTY = [1, 5, 10, 50] as const
export type HarborShopQty = (typeof HARBOR_SHOP_QTY)[number]

export const HARBOR_SHOP_QTY_LABEL: Record<HarborShopQty, string> = {
  1: '1',
  5: '5',
  10: '10',
  50: 'All',
}
