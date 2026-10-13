export const SIDEBAR_WIDTH = { expanded: 208, collapsed: 68 }

const ACTION_ROW_PADDING_X = 12
const ACTION_ROW_GAP = 4

export const SIDEBAR_ACTION_BUTTON = {
  collapsed: { width: 20, height: 20 },
  expanded: {
    width: (SIDEBAR_WIDTH.expanded - ACTION_ROW_PADDING_X * 2 - ACTION_ROW_GAP) / 2,
    height: 36
  }
} as const
