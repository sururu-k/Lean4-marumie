import type {ComponentProps} from 'react'

/** Shared control for the recording size selector. */
export function Button({children, ...props}:ComponentProps<'button'>){
 // ai-design-check-ignore-next-line use-shared-components -- This shared Button primitive owns the native button element.
 return <button {...props} type="button" className="demo-button">{children}</button>
}
