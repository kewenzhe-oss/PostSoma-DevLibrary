import React from "react";
import { icons } from "@/lib/icons";

export type IconName = keyof typeof icons;

interface IconProps {
  name?: IconName;
  component?: React.ComponentType<any>;
  size?: number;
  className?: string;
}

export default function Icon({ name, component, size = 16, className = "" }: IconProps) {
  const IconComponent = component || (name ? icons[name] : null);

  if (!IconComponent) return null;

  return (
    <IconComponent
      size={size}
      className={className}
      aria-hidden="true"
    />
  );
}
