# Placeholder manifest

> **Generated** from `_data/grammar.yml` by `npm run gen` — do not edit by hand.
> This is the single source the readiness widget reads (via POLICY), so the manifest
> and the widget always match. To change a placeholder, edit the field's `blank:` in
> `_data/grammar.yml` and re-run `npm run gen`.

Legend: **•** = required · _driver_ = a real value that positions the layout (no placeholder).

## hero

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `title` | • | text | `Page title` |
| `eyebrow` |  | text | `Category label` |
| `subtitle` |  | text | `Subtitle` |
| `subtitle_meta` |  | text | `Meta tag` |
| `desc` |  | richtext | `Write a short lead paragraph for this page.` |
| `stats` |  | list<stat> | _(template — see sub-fields)_ |
| `stats[].num` | • | text | `Value` |
| `stats[].label` | • | text | `Stat label` |
| `stats[].color` |  | color | — |
| `search` |  | bool | `false`  _(default)_ |
| `search_placeholder` |  | text | `Search this wiki…` |
| `spotlight` |  | spotlight | _(template — see sub-fields)_ |
| `spotlight.eyebrow` |  | text | `Spotlight` |
| `spotlight.title` | • | text | `Spotlight title` |
| `spotlight.desc` |  | richtext | `Write a short description.` |
| `spotlight.tags` |  | list<text> | `Tag`  _(per new item)_ |
| `spotlight.cta` | • | text | `Button label` |
| `spotlight.cta_href` |  | url | — |
| `feature` |  | feature | _(template — see sub-fields)_ |
| `feature.head_left` |  | text | `Featured` |
| `feature.head_right` |  | text | `Label` |
| `feature.title` | • | text | `Feature title` |
| `feature.desc` |  | richtext | `Write a short description.` |
| `feature.chips` | • | list<chip> | — |
| `feature.chips[].key` | • | text | `Label` |
| `feature.chips[].val` | • | text | `Value` |

## overview

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | text | `Section heading` |
| `paragraphs` | • | list<richtext> | `Write the overview here (at least 100 words)…`  _(per new item)_ |
| `tone` |  | enum | `b`  _(choice: a · b · special)_ |
| `infobox` |  | infobox | _(template — see sub-fields)_ |
| `infobox.label` |  | text | `Infobox` |
| `infobox.title` | • | text | `Infobox title` |
| `infobox.sublabel` |  | text | `Sub-label` |
| `infobox.rows` |  | list<pair> | _(template — see sub-fields)_ |
| `infobox.rows[].label` | • | text | `Label` |
| `infobox.rows[].value` | • | richtext | `Value` |
| `infobox.badge` |  | text | `Status badge` |

## spec

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | text | `Specifications heading` |
| `device` | • | text | `Device · MODEL` |
| `tone` |  | enum | `special`  _(choice: a · b · special)_ |
| `cards` | • | list<card> | _(template — see sub-fields)_ |
| `cards[].title` | • | text | `Spec title` |
| `cards[].icon` | • | icon | — |
| `cards[].rows` | • | list<pair> | _(template — see sub-fields)_ |
| `cards[].rows[].label` | • | text | `Label` |
| `cards[].rows[].value` | • | text | `Value` |

## config

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | text | `Configurations heading` |
| `chart_title` | • | text | `Chart title` |
| `tone` |  | enum | `a`  _(choice: a · b · special)_ |
| `intro` |  | list<richtext> | `Intro paragraph`  _(per new item)_ |
| `footer` |  | richtext | `Footer spec line` |
| `divider_label` |  | text | `Revised` |
| `items` | • | list<config_item> | _(template — see sub-fields)_ |
| `items[].capacity` | • | number | _(driver — real value, no placeholder)_ |
| `items[].unit` |  | enum | `GB`  _(choice: GB · TB)_ |
| `items[].model` |  | text | `Model` |
| `items[].price` |  | text | `$0` |
| `items[].dates` |  | text | `Dates` |
| `items[].revised` |  | bool | `false`  _(default)_ |
| `items[].colors` |  | list<dot> | _(template — see sub-fields)_ |
| `items[].colors[].name` |  | text | `Color` |
| `items[].colors[].hex` |  | color | `#9aa0a6` |
| `items[].colors[].ring` |  | bool | `false`  _(default)_ |

## lifecycle-lane

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | richtext | `Heading` |
| `title` | • | text | `Lifecycle title` |
| `paragraphs` |  | list<richtext> | `intro text describing the software lifecycle of the device`  _(per new item)_ |
| `tone` |  | enum | `a`  _(choice: a · b · special)_ |
| `weighted` |  | bool | `false`  _(default)_ |
| `end` |  | date | `Jan 2024` |
| `range_note` |  | text | `note` |
| `segments` | • | list<segment> | _(template — see sub-fields)_ |
| `segments[].ver` | • | text | `Version` |
| `segments[].date` | • | date | `Month Year` |
| `segments[].type` | • | enum | `full`  _(choice: full · partial · dropped · security)_ |
| `segments[].badge` |  | text | `Badge` |
| `segments[].badge_type` |  | enum | `ship`  _(choice: ship · paid · limited · final · dropped · security)_ |
| `notes` |  | list<note> | _(template — see sub-fields)_ |
| `notes[].status` | • | enum | `full`  _(choice: full · partial · limited · final · dropped · security)_ |
| `notes[].label` | • | text | `Note label` |
| `notes[].text` | • | richtext | `Note body` |

## delta

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | text | `Changes heading` |
| `tone` |  | enum | `a`  _(choice: a · b · special)_ |
| `intro` |  | richtext | `Add an intro line` |
| `footnote` |  | richtext | `Add a footnote` |
| `prev` | • | axis_old | — |
| `prev.name` | • | text | `Old model` |
| `prev.year` |  | text | — |
| `current` | • | axis_new | — |
| `current.name` | • | text | `New model` |
| `current.year` |  | text | — |
| `hardware` |  | list<delta_row> | _(template — see sub-fields)_ |
| `hardware[].label` | • | text | `Spec label` |
| `hardware[].old` |  | text | — |
| `hardware[].new` |  | text | — |
| `hardware[].no_old` |  | bool | `false`  _(default)_ |
| `hardware[].chip` |  | enum | `better`  _(choice: better · feature · changed · worse · same)_ |
| `hardware[].chip_text` |  | text | — |
| `software` |  | list<delta_row> | _(template — see sub-fields)_ |
| `software[].label` | • | text | `Spec label` |
| `software[].old` |  | text | — |
| `software[].new` |  | text | — |
| `software[].no_old` |  | bool | `false`  _(default)_ |
| `software[].chip` |  | enum | `better`  _(choice: better · feature · changed · worse · same)_ |
| `software[].chip_text` |  | text | — |

## timeline

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `heading` | • | text | `Timeline heading` |
| `tone` |  | enum | `b`  _(choice: a · b · special)_ |
| `card_type` |  | enum | `station`  _(choice: station)_ |
| `events` | • | list<event> | _(template — see sub-fields)_ |
| `events[].month` | • | enum | `Jan`  _(choice: Jan · Feb · Mar · Apr · May · Jun · Jul · Aug · Sep · Oct · Nov · Dec)_ |
| `events[].day` |  | text | `##` |
| `events[].year` | • | text | `Year` |
| `events[].tag` |  | text | `Add a tag` |
| `events[].title` | • | text | `Name this event` |
| `events[].preview` | • | text | `Add a short summary of what happened` |
| `events[].body` | • | richtext | `Write the full story for the expandable card…` |

## catalog

| Field | Req | Type | Placeholder |
|---|---|---|---|
| `title` | • | text | `Catalog title` |
| `tone` |  | enum | `b`  _(choice: a · b · special)_ |
| `unit` |  | text | `item`  _(default)_ |
| `note` |  | text | `Note` |
| `footnote` |  | richtext | `Write a footnote here…` |
| `categories` | • | list<category> | _(template — see sub-fields)_ |
| `categories[].name` | • | text | `New category` |
| `categories[].color` |  | color | — |
| `categories[].ribbon` |  | ribbon | _(template — see sub-fields)_ |
| `categories[].ribbon.text` | • | text | `Ribbon` |
| `categories[].ribbon.tone` |  | enum | `accent`  _(choice: accent · gone)_ |
| `categories[].note` |  | text | `Note` |
| `categories[].items` | • | list<cat_item> | _(template — see sub-fields)_ |
| `categories[].items[].name` | • | text | `New item` |
| `categories[].items[].status` |  | enum | `active`  _(choice: active · discontinued · limited · retired)_ |
| `categories[].items[].info` |  | text | `Info` |
| `categories[].items[].desc` | • | richtext | `What it is.` |
| `categories[].items[].groups` |  | list<pill_group> | _(template — see sub-fields)_ |
| `categories[].items[].groups[].label` |  | text | `Group` |
| `categories[].items[].groups[].pills` |  | list<pill> | `Pill`  _(per new item)_ |
| `categories[].items[].groups[].pills[].text` | • | text | `Pill` |
| `categories[].items[].groups[].pills[].struck` |  | bool | `false`  _(default)_ |
| `categories[].items[].callout` |  | callout | _(template — see sub-fields)_ |
| `categories[].items[].callout.label` |  | text | — |
| `categories[].items[].callout.text` |  | richtext | — |
| `categories[].items[].notes` |  | richtext | `Write a note…` |
| `categories[].items[].cta` |  | url | `#` |

