import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { CommandPalette, type CommandGroupConfig } from '@/components/patterns/command-palette'
import { AreaChartCard, BarChartCard, LineChartCard, PieChartCard } from '@/components/patterns/charts'
import { DataTable } from '@/components/patterns/data-table'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileUpload } from '@/components/ui/file-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'

/**
 * The rows shown by the sample table.
 */
const ROWS = [
  { id: 1, name: 'Ada Lovelace', role: 'owner' },
  { id: 2, name: 'Alan Turing', role: 'admin' },
  { id: 3, name: 'Grace Hopper', role: 'member' },
]

/**
 * The data of the sample charts.
 */
const SERIES = [
  { label: 'January', value: 1200 },
  { label: 'February', value: 2100 },
  { label: 'March', value: 1800 },
]

/**
 * The options of the select and the combobox.
 */
const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

/**
 * Every component of the kit with its main variants. The page is only
 * included in development builds or when the showcase is explicitly enabled.
 */
export default function ShowcasePage() {
  const { t, locale } = useI18n()
  const [checked, setChecked] = useState(false)
  const [switched, setSwitched] = useState(false)
  const [selected, setSelected] = useState('admin')
  const [combo, setCombo] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)

  const groups: CommandGroupConfig[] = [
    {
      heading: t('command'),
      items: [{ id: 'members', label: 'Members', onSelect: () => {} }],
    },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-10 p-6">
        <PageHeader title={t('showcaseTitle')} description={t('showcaseSubtitle')} />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('buttons')}</h2>
          <p className="text-sm text-muted-foreground">{t('buttonsDescription')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <Separator className="my-2" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">Large</Button>
            <Button size="sm">Small</Button>
            <Button size="xs">Extra small</Button>
            <Button size="icon" aria-label="Icon">
              <Loader2Icon />
            </Button>
            <Button disabled>Disabled</Button>
            <Button disabled>
              <Loader2Icon className="animate-spin" />
              {t('showcaseLoading')}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('inputs')}</h2>
          <p className="text-sm text-muted-foreground">{t('inputsDescription')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="showcase-input">Input</Label>
              <Input id="showcase-input" placeholder="Type here" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="showcase-textarea">Textarea</Label>
              <Textarea id="showcase-textarea" placeholder="Type here" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="showcase-select">Select</Label>
              <Select value={selected} onValueChange={(value) => setSelected(value ?? '')}>
                <SelectTrigger id="showcase-select">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="showcase-combobox">Combobox</Label>
              <Combobox
                items={ROLES}
                value={combo}
                onValueChange={(value) => setCombo(value as string | null)}
              >
                <ComboboxInput id="showcase-combobox" placeholder="Search a role" />
                <ComboboxContent>
                  <ComboboxList>
                    {(item: { value: string; label: string }) => (
                      <ComboboxItem key={item.value} value={item.value}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="space-y-2">
              <Label>Checkbox</Label>
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
                aria-label="Accept the terms"
              />
            </div>
            <div className="space-y-2">
              <Label>Radio group</Label>
              <RadioGroup value={selected} onValueChange={(value) => setSelected(value ?? '')}>
                <RadioGroupItem value="owner" aria-label="Owner" />
                <RadioGroupItem value="admin" aria-label="Admin" />
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Switch</Label>
              <Switch
                checked={switched}
                onCheckedChange={(value) => setSwitched(value)}
                aria-label="Enable notifications"
              />
            </div>
            <div className="space-y-2">
              <Label>Date picker</Label>
              <DatePicker value={date} onChange={setDate} locale={locale} />
            </div>
            <div className="space-y-2">
              <Label>File upload</Label>
              <FileUpload onFilesChange={() => {}} label="Attachment" hint="PDF or PNG, up to 5 MB" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('overlays')}</h2>
          <p className="text-sm text-muted-foreground">{t('overlaysDescription')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger render={<Button>Dialog</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog</DialogTitle>
                  <DialogDescription>A modal surface with a focus trap.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline">Sheet</Button>} />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet</SheetTitle>
                  <SheetDescription>A panel sliding from the edge of the screen.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline">Dropdown menu</Button>} />
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>

            <ContextMenu>
              <ContextMenuTrigger className="rounded-lg border px-3 py-2 text-sm">
                Right click here
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Copy</ContextMenuItem>
                <ContextMenuItem>Paste</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            <Popover>
              <PopoverTrigger render={<Button variant="outline">Popover</Button>} />
              <PopoverContent>Popover content</PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Tooltip</Button>} />
              <TooltipContent>Tooltip content</TooltipContent>
            </Tooltip>
          </div>

          <Tabs defaultValue="one">
            <TabsList>
              <TabsTrigger value="one">One</TabsTrigger>
              <TabsTrigger value="two">Two</TabsTrigger>
            </TabsList>
            <TabsContent value="one">First tab</TabsContent>
            <TabsContent value="two">Second tab</TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('feedback')}</h2>
          <p className="text-sm text-muted-foreground">{t('feedbackDescription')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => toast.success('Saved', { description: 'The change was stored.' })}
            >
              Toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error('Something went wrong')}
            >
              Toast error
            </Button>
          </div>
          <EmptyState
            title="Nothing here yet"
            description="Create the first record to fill this space."
            action={<Button>Create</Button>}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('data')}</h2>
          <p className="text-sm text-muted-foreground">{t('dataDescription')}</p>

          <div className="flex flex-wrap items-center gap-4">
            <Avatar>
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Members</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Card</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROWS.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'role', header: 'Role' },
            ]}
            data={ROWS}
            total={ROWS.length}
            emptyState="No members found"
            labels={{ search: 'Search' }}
          />

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('charts')}</h2>
          <p className="text-sm text-muted-foreground">{t('chartsDescription')}</p>
          <div className="grid gap-6 lg:grid-cols-2">
            <LineChartCard data={SERIES} locale={locale} seriesName="Signups" />
            <BarChartCard data={SERIES} locale={locale} seriesName="Signups" />
            <AreaChartCard data={SERIES} locale={locale} seriesName="Signups" />
            <PieChartCard data={SERIES} locale={locale} seriesName="Signups" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('command')}</h2>
          <p className="text-sm text-muted-foreground">{t('commandDescription')}</p>
          <Command>
            <CommandInput placeholder="Type a command…" />
            <CommandList>
              <CommandItem>Members</CommandItem>
              <CommandItem>Billing</CommandItem>
            </CommandList>
          </Command>
          <CommandPalette groups={groups} />
        </section>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
