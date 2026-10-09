import React from "react"

export interface StarIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  color?: string
  title?: string
}

export default function StarIcon({
  className = "w-4 h-4",
  color = "#C5A880",
  title,
  ...props
}: StarIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={color}
      stroke="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  )
}
