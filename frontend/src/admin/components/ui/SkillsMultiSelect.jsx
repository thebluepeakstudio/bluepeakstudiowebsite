import CheckboxMultiSelect from "./CheckboxMultiSelect";
import { PROJECT_TYPES } from "../../utils/constants";

export default function SkillsMultiSelect({
  label = "Skills",
  value = [],
  onChange,
  required,
}) {
  return (
    <CheckboxMultiSelect
      label={label}
      options={PROJECT_TYPES}
      value={value}
      onChange={onChange}
      required={required}
      columns={2}
    />
  );
}
