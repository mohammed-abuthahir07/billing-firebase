import { Monitor, Moon, Sun } from "lucide-react";
import "./ThemePicker.css";

const OPTIONS = [
  {
    id: "light",
    title: "Light Mode",
    copy: "White and light-grey surfaces with the navy navigation.",
    icon: Sun,
  },
  {
    id: "dark",
    title: "Dark Mode",
    copy: "Dark workspace, light text, and the same brand blue.",
    icon: Moon,
  },
  {
    id: "system",
    title: "System Default",
    copy: "Follows this device and updates when the system theme changes.",
    icon: Monitor,
  },
];

const ThemePicker = ({ value, onChange, label }) => (
  <div className="theme-picker" role="radiogroup" aria-label={label}>
    {OPTIONS.map((option) => {
      const Icon = option.icon;
      const selected = value === option.id;
      return (
        <button
          key={option.id}
          type="button"
          className={`theme-picker-card ${selected ? "active" : ""}`}
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(option.id)}
        >
          <span className={`theme-picker-preview ${option.id}`} aria-hidden="true">
            <span className="theme-picker-side" />
            <span className="theme-picker-main">
              <span className="theme-picker-bar" />
              <span className="theme-picker-block" />
            </span>
          </span>
          <span className="theme-picker-copy">
            <span className="theme-picker-title">
              <Icon size={16} />
              {option.title}
              {selected && <span className="theme-picker-badge">Active</span>}
            </span>
            <span className="theme-picker-text">{option.copy}</span>
          </span>
        </button>
      );
    })}
  </div>
);

export default ThemePicker;
