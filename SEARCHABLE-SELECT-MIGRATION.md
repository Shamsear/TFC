# Searchable Select Migration Guide

## Overview
A reusable `SearchableSelect` component has been created at `components/ui/SearchableSelect.tsx` to replace all native `<select>` elements with searchable dropdowns.

## Component Location
```
components/ui/SearchableSelect.tsx
```

## Already Updated Components
✅ `components/players/AllPlayersClient.tsx` - Position and Team filters
✅ `components/admin/PlayerReplacementClient.tsx` - Team and Player selects
✅ `components/admin/PlayerManagementClient.tsx` - Team and Destination Team selects

## How to Use

### 1. Import the Component
```tsx
import SearchableSelect from '@/components/ui/SearchableSelect'
```

### 2. Replace Native Select

**Before:**
```tsx
<select
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  className="..."
>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

**After:**
```tsx
<SearchableSelect
  label="Label Text"
  value={selectedValue}
  options={[
    { value: '', label: 'Select...' },
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]}
  onChange={setSelectedValue}
  enableSearch={true}
/>
```

### 3. Props Reference

```tsx
interface SearchableSelectProps {
  label?: string              // Optional label above dropdown
  value: string              // Current selected value
  options: string[] | { value: string; label: string }[]  // Options array
  onChange: (value: string) => void  // Change handler
  placeholder?: string       // Placeholder text (default: 'Select...')
  className?: string         // Additional CSS classes
  disabled?: boolean         // Disable the select
  required?: boolean         // Show required asterisk
  enableSearch?: boolean     // Enable search functionality (default: true)
  displayValue?: (val: string) => string  // Custom display formatter
}
```

## Remaining Files to Update

### High Priority (User-Facing)

1. **components/admin/AuditLogDeleteClient.tsx**
   - Line 118: Team filter select

2. **components/admin/AuditLogViewer.tsx**
   - Line 102: Action filter select

3. **components/admin/TransferFixClient.tsx**
   - Line 158: Team select

4. **components/admin/TransfersClient.tsx**
   - Line 143: Round filter select

5. **components/admin/CreateTeamManagerForm.tsx**
   - Line 147: Team assignment select

6. **components/admin/EditTeamManagerForm.tsx**
   - Line 212: Team assignment select

7. **components/admin/PlayersManagementClient.tsx**
   - Line 326: Club filter select

8. **components/team/AuctionPlannerClient.tsx**
   - Line 972: Playing style filter select

9. **components/team-auction/RoundBiddingClient.tsx**
   - Line 431: Position filter select

10. **components/players/PlayersSearchClient.tsx**
    - Line 433: Playing style select

11. **components/import/PlayerPreviewList.tsx**
    - Line 661: Position filter select

12. **components/auction/RoundDetailClient.tsx**
    - Line 1084: Finalization mode select

13. **components/tournament/KnockoutBracket.tsx**
    - Lines 136, 149: Team selection selects

14. **components/tournament/MatchEditor.tsx**
    - Line 101: Match status select

15. **components/tournament/TournamentFormAdvanced.tsx**
    - Line 352: Group qualifiers select

### Admin Pages

16. **app/(admin)/super-admin/audit-logs/page.tsx**
    - Lines 98, 120, 142: Sub-admin, Season, Action type filters

17. **app/(admin)/sub-admin/import/page.tsx**
    - Line 87: Season select

18. **app/(admin)/super-admin/teams/new/page.tsx**
    - Line 298: Season assignment select

19. **app/(admin)/sub-admin/[seasonId]/calendar/[calendarId]/page.tsx**
    - Line 473: Team select

20. **app/(admin)/sub-admin/[seasonId]/auction-settings/page.tsx**
    - Line 178: Auction timing select

## Migration Pattern

For each file:

1. **Add import:**
   ```tsx
   import SearchableSelect from '@/components/ui/SearchableSelect'
   ```

2. **Convert options:**
   ```tsx
   // From:
   <option value="val">Label</option>
   
   // To:
   { value: 'val', label: 'Label' }
   ```

3. **Replace select element:**
   ```tsx
   // From:
   <select value={val} onChange={(e) => setVal(e.target.value)}>
   
   // To:
   <SearchableSelect value={val} onChange={setVal} options={...} />
   ```

4. **Enable search for long lists:**
   - Always use `enableSearch={true}` for lists with 5+ items
   - Optional for shorter lists

## Benefits

✅ Consistent UI across the application
✅ Better UX with search functionality
✅ Keyboard navigation support
✅ Auto-focus on search input
✅ Mobile-friendly
✅ Dark theme compatible
✅ Accessible

## Testing Checklist

After migration, test:
- [ ] Dropdown opens/closes correctly
- [ ] Search filters options
- [ ] Selection updates state
- [ ] Keyboard navigation works
- [ ] Mobile responsive
- [ ] Disabled state works
- [ ] Required indicator shows
- [ ] Custom display values work

## Notes

- The component automatically handles click-outside to close
- Search is case-insensitive
- Separators (lines with '───') are preserved in filtered results
- Empty state shows "No results found"
- Component uses existing dark theme colors
