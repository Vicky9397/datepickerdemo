import { registerLicense } from "@syncfusion/ej2-base";
import {
    DateRangePickerComponent,
    PresetsDirective,
    PresetDirective,
} from "@syncfusion/ej2-react-calendars";

/* ============================================================
 * SBDateRangePickerPaid - sample wrapper around the commercial
 * Syncfusion DateRangePicker (@syncfusion/ej2-react-calendars).
 *
 * Included so the paid/licensed option can be compared side by
 * side with the custom and MUI pickers. Syncfusion uses a single
 * editable field plus a rich range popup; the popup is where the
 * paid value shows: quick-select PRESETS, a two-month view, a
 * live day-span count, and Apply/Cancel. Those presets are the
 * clearest "this is an enterprise component" signal, so they are
 * wired up here.
 *
 * Public contract matches the other two pickers:
 *   onChange: (e) => void          where e.value = { start, end }
 *   componentName: string          key used for sessionStorage
 *
 * Licensing: Syncfusion is commercial (with a free Community
 * License for small teams). Without a key it renders a trial
 * notice but stays fully functional for evaluation. Drop your key
 * into a .env file as VITE_SYNCFUSION_LICENSE to remove it
 * (see .env.example).
 * ============================================================ */

const LICENSE_KEY = import.meta.env.VITE_SYNCFUSION_LICENSE;
if (LICENSE_KEY) {
    try {
        registerLicense(LICENSE_KEY);
    } catch {
        /* malformed key - fall back to the trial notice */
    }
}

// Quick-select ranges shown in the popup sidebar (computed relative to today).
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shiftDays = (d, n) => {
    const x = startOfDay(d);
    x.setDate(x.getDate() + n);
    return x;
};
const TODAY = startOfDay(new Date());
const PRESETS = [
    { label: "Today", start: TODAY, end: TODAY },
    { label: "Last 7 days", start: shiftDays(TODAY, -6), end: TODAY },
    { label: "Last 30 days", start: shiftDays(TODAY, -29), end: TODAY },
    { label: "This month", start: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), end: TODAY },
    { label: "This year", start: new Date(TODAY.getFullYear(), 0, 1), end: TODAY },
];

export const SBDateRangePickerPaid = ({
    onChange,
    componentName = "paidDemo",
    ...props
}) => {
    const handleChange = (args) => {
        const next = {
            start: args?.startDate ?? null,
            end: args?.endDate ?? null,
        };
        if (componentName && (next.start || next.end)) {
            try {
                sessionStorage.setItem(
                    `${componentName}_dateRange`,
                    JSON.stringify({
                        start: next.start ?? null,
                        end: next.end ?? null,
                    })
                );
            } catch {
                /* storage unavailable - persistence is best-effort */
            }
        }
        onChange?.({ value: next });
    };

    return (
        <DateRangePickerComponent
            format="MM/dd/yyyy"
            placeholder="MM/DD/YYYY – MM/DD/YYYY"
            showClearButton
            change={handleChange}
            {...props}
        >
            <PresetsDirective>
                {PRESETS.map((p) => (
                    <PresetDirective key={p.label} label={p.label} start={p.start} end={p.end} />
                ))}
            </PresetsDirective>
        </DateRangePickerComponent>
    );
};
