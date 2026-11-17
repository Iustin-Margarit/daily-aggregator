"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

import { cn } from "@/lib/utils"

/*
 * Menus are printed slips of paper: a double hairline frame with the paper's
 * grain, items highlighted in a brass wash, the chosen option marked with a
 * brass ✦ and separators as double hairlines.
 */

/**
 * Menus are non-modal by default. A modal menu that opens a dialog from one of
 * its items leaves `pointer-events: none` on <body> after the dialog closes
 * (a Radix bug), which makes the whole page unclickable.
 */
type MenuOpenState = { open: boolean; setOpen: (open: boolean) => void }
const MenuOpen = React.createContext<MenuOpenState | null>(null)

const DropdownMenu = ({
  modal = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => {
  // Kept here (controlled or not) so the trigger can open the menu on a finger's tap itself (below).
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const state = React.useMemo(() => ({ open, setOpen }), [open, setOpen])
  return (
    <MenuOpen.Provider value={state}>
      <DropdownMenuPrimitive.Root modal={modal} open={open} onOpenChange={setOpen} {...props} />
    </MenuOpen.Provider>
  )
}

/** How far a finger may move between landing and lifting and still count as a tap, in CSS pixels. */
const TAP_SLOP = 10

/**
 * Radix opens a menu the moment a pointer lands on its trigger, which on a phone is
 * also the start of every scroll: a thumb scrolling past a menu button popped the
 * menu open. With a mouse it still opens on the press; with a finger or a pen it
 * opens only on a deliberate tap, the click the browser sends when the finger lifts
 * (none after a scroll), and not when the finger slid more than a few pixels.
 * Keyboard opening (Enter, Space, arrow down) is Radix's own and unchanged.
 */
const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ onPointerDown, onPointerCancel, onClick, ...props }, ref) => {
  const menu = React.useContext(MenuOpen)
  const landed = React.useRef<{ x: number; y: number; wasOpen: boolean } | null>(null)
  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      {...props}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (event.pointerType === "mouse") {
          landed.current = null
          return
        }
        // Touch or pen: Radix skips its own open when the event is marked handled; the tap's click opens it.
        // Whether it was open is noted now: a tap on the trigger of an open menu also counts as a press
        // outside the menu, which closes it before the click arrives, and must not open it again.
        landed.current = { x: event.clientX, y: event.clientY, wasOpen: menu?.open ?? false }
        event.preventDefault()
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        // The browser took the finger over for scrolling.
        landed.current = null
      }}
      onClick={(event) => {
        onClick?.(event)
        const start = landed.current
        landed.current = null
        if (!start || !menu || event.defaultPrevented) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) return
        menu.setOpen(!start.wasOpen)
      }}
    />
  )
})
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-[2px] px-2 py-1.5 font-serif text-[0.97rem] outline-hidden focus:bg-(--ink-gold)/14 data-[state=open]:bg-(--ink-gold)/14",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <span aria-hidden="true" className="ml-auto text-(--ink-gold)">›</span>
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "card-paper z-50 min-w-32 overflow-hidden bg-popover p-1.5 text-popover-foreground shadow-float data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "card-paper z-50 min-w-32 overflow-hidden bg-popover p-1.5 text-popover-foreground shadow-float",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[2px] px-2.5 py-2 font-serif text-[0.97rem] outline-hidden transition-colors focus:bg-(--ink-gold)/14 focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[2px] py-2 pl-8 pr-2.5 font-serif text-[0.97rem] outline-hidden transition-colors focus:bg-(--ink-gold)/14 focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    {/* A printed box on every line, ticked in brass when chosen, so the list reads as a checklist at once. */}
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center rounded-[2px] border border-rule/70 bg-card/60" aria-hidden="true">
      <DropdownMenuPrimitive.ItemIndicator>
        <span className="text-[0.8rem] font-bold leading-none text-(--brass-ink)">✓</span>
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[2px] py-2 pl-8 pr-2.5 font-serif text-[0.97rem] outline-hidden transition-colors focus:bg-(--ink-gold)/14 focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <span className="text-[0.8rem] leading-none text-(--ink-gold)" aria-hidden="true">✦</span>
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1.5 h-[4px] border-y border-rule/30", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}