import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateRangePicker } from "@mui/x-date-pickers-pro/DateRangePicker";

// 2-digit year entry maps 0..99 -> 2000..2099.
// If you also need past dates, swap to a pivot (e.g. y > 68 ? 1900 : 2000).
const YEAR_PREFIX = 2000;

const expandYear = (date) => {
    if (!date) return date;
    const y = date.getFullYear();
    if (y >= 0 && y < 100) {
        const d = new Date(date);
        d.setFullYear(YEAR_PREFIX + y);
        return d;
    }
    return date;
};

const toMuiRange = (range) => [
    range?.start ? dayjs(range.start) : null,
    range?.end ? dayjs(range.end) : null,
];

const fromMuiRange = ([start, end]) => ({
    start: start && start.isValid() ? start.toDate() : null,
    end: end && end.isValid() ? end.toDate() : null,
});

export const SBDateRangePicker = ({ value, onChange, componentName, ...props }) => {
    const [dateValue, setDateValue] = useState(value ?? { start: null, end: null });
    //const location = useLocation();
    const resolvedName = "DatePicker"
    //const resolvedName = componentName
    //    ? componentName
    //    : location.pathname
    //        .split("/")
    //        .filter(Boolean)
    //        .pop()
    //        ?.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // "activity-list" -> "activityList"

    useEffect(() => {
        if (value) setDateValue(value);
    }, [value]);

    const persist = useCallback((range) => {
        if (resolvedName && (range.start || range.end)) {
            sessionStorage.setItem(
                `${resolvedName}_dateRange`,
                JSON.stringify({
                    start: range.start ?? null,
                    end: range.end ?? null,
                })
            );
        }
    }, [resolvedName]);

    const commit = (range) => {
        setDateValue(range);
        persist(range);
        onChange?.({ value: range });
    };

    // Echo MUI's value as-is while typing; do not expand here or 4-digit
    // year entry breaks.
    const handleOnChange = (muiValue) => {
        commit(fromMuiRange(muiValue));
    };

    // Expand 2-digit years only once focus leaves the field. Idempotent:
    // a real 4-digit year is left untouched.
    const handleBlur = () => {
        const expanded = {
            start: expandYear(dateValue.start),
            end: expandYear(dateValue.end),
        };
        const changed =
            expanded.start?.getTime() !== dateValue.start?.getTime() ||
            expanded.end?.getTime() !== dateValue.end?.getTime();
        if (changed) commit(expanded);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateRangePicker
                className="SbaDateRage"
                value={toMuiRange(dateValue)}
                onChange={handleOnChange}
                onClose={handleBlur}
                format="MM/DD/YYYY"
                calendars={2}
                sx={{width:350}}
                slotProps={{
                    textField: { onBlur: handleBlur },
                    field: { clearable: true },
                }}
                {...props}
            />
        </LocalizationProvider>
    );
};