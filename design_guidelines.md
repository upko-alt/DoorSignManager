# E-Paper Door Sign Dashboard - Design Guidelines

## Design Approach: Material Design System
**Rationale:** This is a utility-focused dashboard for internal department use, prioritizing efficiency, clarity, and real-time information display. Material Design provides the perfect foundation with its emphasis on functional layouts, clear visual hierarchy, and data-dense interfaces.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- Background: 220 15% 12% (deep slate)
- Surface: 220 15% 16% (elevated slate)
- Primary: 210 100% 60% (vibrant blue for active states)
- Success: 142 76% 45% (green for "Available" status)
- Warning: 38 92% 55% (amber for "In Meeting" status)
- Danger: 0 84% 60% (red for "Out" status)
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 70%

**Light Mode:**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Primary: 210 100% 50%
- Status colors remain consistent with adjusted luminosity

### B. Typography
- **Font Family:** Inter (Google Fonts) for body and UI, Roboto for headers
- **Scale:**
  - Dashboard Title: text-3xl font-bold (30px)
  - Section Headers: text-xl font-semibold (20px)
  - Member Names: text-lg font-medium (18px)
  - Status Text: text-base font-normal (16px)
  - Buttons/Labels: text-sm font-medium (14px)
  - Timestamps: text-xs (12px)

### C. Layout System
- **Spacing Units:** Consistent use of 4, 6, 8, 12, 16 unit scale (p-4, m-6, gap-8, etc.)
- **Container:** max-w-7xl with px-4 sm:px-6 lg:px-8
- **Grid:** 1-2-3 column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Card Padding:** p-6 for content, p-4 for compact elements

### D. Component Library

**Dashboard Header:**
- Fixed top bar with department name, refresh status indicator, and dark mode toggle
- Height: h-16, sticky positioning, subtle shadow

**Status Cards (Primary Component):**
- Elevated cards (shadow-lg) with rounded-xl borders
- Member photo/avatar (48x48px) in top-left
- Member name prominently displayed
- Current status badge with color-coded background and icon
- Last updated timestamp in muted text
- Quick action buttons below status
- Hover state: subtle lift with shadow-xl transition

**Status Control Panel:**
- Horizontal button group for predefined statuses
- Each button shows status name + icon (Heroicons)
- Active status highlighted with primary color
- Custom text input field with character counter (max 50 chars)
- "Update" button with loading state indicator

**Predefined Status Buttons:**
- "Available" (green, check icon)
- "In Meeting" (amber, clock icon)  
- "Out" (red, x-circle icon)
- "Do Not Disturb" (purple, bell-slash icon)
- "Be Right Back" (blue, arrow-path icon)

**Real-time Indicators:**
- Pulsing dot animation for recently updated statuses
- "Syncing..." state with subtle spinner
- Success/error toast notifications (bottom-right, auto-dismiss 3s)

**Data Display:**
- Status history log (optional expandable section per card)
- Department overview metrics at top (total members, available count, last sync time)

### E. Responsive Behavior
- **Desktop (lg:):** 3-column card grid, side panel for controls
- **Tablet (md:):** 2-column grid, controls stacked
- **Mobile (base):** Single column, sticky control panel at bottom

### F. Interactions
- **Status Updates:** Optimistic UI updates with rollback on error
- **Auto-refresh:** Poll JSON endpoint every 30s with visual indicator
- **Transitions:** 200ms ease-in-out for all state changes
- **Loading States:** Skeleton screens for initial load, inline spinners for updates

## Images
No hero images required. Use professional avatar placeholders for team members (circular, 48x48px). Consider department logo in header (32x32px).

## Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation for status selection
- High contrast status colors meeting WCAG AA standards
- Focus indicators on all buttons (ring-2 ring-offset-2)
- Screen reader announcements for status updates