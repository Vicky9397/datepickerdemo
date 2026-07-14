import { registerLicense } from "@syncfusion/ej2-base";
import { DateRangePickerComponent } from "@syncfusion/ej2-react-calendars";

/* ============================================================
 * SBDateRangePickerPaid - sample wrapper around the commercial
 * Syncfusion DateRangePicker (@syncfusion/ej2-react-calendars).
 *
 * Included so the paid/licensed option can be compared side by
 * side with the custom and MUI pickers on the same criterion:
 * keyboard usability. Syncfusion uses a single editable field
 * ("start - end") plus a range calendar popup, so it shows a
 * different keyboard model from the two segmented pickers.
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
            change={handleChange}
            {...props}
        />
    );
};
