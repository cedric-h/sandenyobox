// vim: sw=2 ts=2 expandtab smartindent ft=javascript
const DEBUG_VIS = 1;

const ready = require('enyo/ready'),
      kind = require('enyo/kind');

const Button          = require('enyo/Button'),
      Collection      = require('enyo/Collection'),
      Model           = require('enyo/Model'),
      DataRepeater    = require('enyo/DataRepeater'),
      Group           = require('enyo/Group'),
      EnyoApplication = require("enyo/Application"),
      EnyoImage       = require('enyo/Image');

/* ticks per second */
const TPS = 60;

function lerp(v0, v1, t) { return (1 - t) * v0 + t * v1; }
function inv_lerp(min, max, p) { return (((p) - (min)) / ((max) - (min))); }
function ease_out_sine(x) {
  return Math.sin((x * Math.PI) / 2);
}
function ease_out_circ(x) {
  return Math.sqrt(1 - Math.pow(x - 1, 2));
}
function ease_out_expo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function ease_in_expo(x) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
/* squared distance from point to point (dot product with itself) */
function point_to_point2(x0, y0, x1, y1) {
  return Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2);
}
/* squared distance from point to line */
function point_to_line2(v, w, p_x, p_y) {
  const l2 = point_to_point2(v.x, v.y, w.x, w.y);
  if (l2 == 0) return point_to_point2(p_x, p_y, v.x, v.y);

  let t = ((p_x - v.x) * (w.x - v.x) + (p_y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return point_to_point2(
    p_x, p_y,
    v.x + t * (w.x - v.x),
    v.y + t * (w.y - v.y)
  );
}
function point_to_point(x0, y0, x1, y1) { return Math.sqrt(point_to_point2(x0, y0, x1, y1)); }
function point_to_line (from, to, x, y) { return Math.sqrt(point_to_line2 (from, to, x, y)); }
function line_hits_line(from0, to0, from1, to1) {
  const a = from0.x, b = from0.y,
        c =   to0.x, d =   to0.y,
        p = from1.x, q = from1.y,
        r =   to1.x, s =   to1.y;
  let det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}
/* returns distance from line to line */
function line_to_line(from0, to0, from1, to1) {
  if (line_hits_line(from0, to0, from1, to1))
    return 0;
  return Math.min(
    point_to_line(from0, to0, from1.x, from1.y),
    point_to_line(from0, to0,   to1.x,   to1.y),
    point_to_line(from1, to1, from0.x, from0.y),
    point_to_line(from1, to1,   to0.x,   to0.y)
  );
}
function vec2_reflect(vx, vy, nx, ny) {
  const vdotn = vx*nx + vy*ny;
  return {
    x: vx - (2 * vdotn * nx),
    y: vy - (2 * vdotn * ny),
  };
}
function rad_distance(a, b) {
  const fmodf = (l, r) => l % r;
  const difference = fmodf(b - a, Math.PI*2.0),
        distance = fmodf(2.0 * difference, Math.PI*2.0) - difference;
  return distance;
}
function rad_lerp(a, b, t) {
  const fmodf = (l, r) => l % r;
  const difference = fmodf(b - a, Math.PI*2.0),
        distance = fmodf(2.0 * difference, Math.PI*2.0) - difference;
  return a + distance * t;
}

let _id = 0;
const ID_NONE           = _id++;
const ID_ITEM_WOOD      = _id++;
const ID_ITEM_SCREW     = _id++;
const ID_ITEM_AXE       = _id++;
const ID_ITEM_FLARE     = _id++;
const ID_ITEM_AIRSTRIKE = _id++;
const ID_ITEM_PC        = _id++;
const ID_ITEM_BOOK      = _id++;
const ID_TRAP_WALL      = _id++;
const ID_TRAP_PISTON    = _id++;
const ID_TRAP_SWINGER   = _id++;
const ID_TRAP_BLASTER   = _id++;
const ID_TRAP_AUTO      = _id++;

const can_afford = (inv, recipe) => {
  for (const id in recipe) {
    const needs = recipe[id];
    const has   = inv.get(id);
    if (has < needs)
      return false;
  }
  return true;
}

const id_to_slug = {
  [ID_NONE          ]: "warning",
  [ID_ITEM_WOOD     ]: "wood",
  [ID_ITEM_SCREW    ]: "screw",
  [ID_ITEM_AXE      ]: "axe",
  [ID_ITEM_FLARE    ]: "flare",
  [ID_ITEM_AIRSTRIKE]: "airstrike",
  [ID_ITEM_PC       ]: "targeting_computer",
  [ID_ITEM_BOOK     ]: "big_book_of_bargains",
  [ID_TRAP_WALL     ]: "trap_wall",
  [ID_TRAP_PISTON   ]: "trap_piston",
  [ID_TRAP_SWINGER  ]: "trap_swinger",
  [ID_TRAP_BLASTER  ]: "trap_blaster",
  [ID_TRAP_AUTO     ]: "trap_auto",
};
const id_to_name = {
  [ID_NONE          ]: "WARNING",
  [ID_ITEM_WOOD     ]: "wood",
  [ID_ITEM_SCREW    ]: "screw",
  [ID_ITEM_AXE      ]: "axe",
  [ID_ITEM_FLARE    ]: "red flare",
  [ID_ITEM_AIRSTRIKE]: "airstrike",
  [ID_ITEM_PC       ]: "targeting computer",
  [ID_ITEM_BOOK     ]: "big book of bargains",
  [ID_TRAP_WALL     ]:  "wall \"trap\"",
  [ID_TRAP_PISTON   ]:  "piston trap",
  [ID_TRAP_SWINGER  ]: "swinger trap",
  [ID_TRAP_BLASTER  ]: "blaster trap",
  [ID_TRAP_AUTO     ]:    "auto trap",
};
const id_to_desc = {
  [ID_NONE          ]: "an error has occurred",
  [ID_ITEM_WOOD     ]: "collected from trees, used to make defenses",
  [ID_ITEM_SCREW    ]: "bought from vendors, used to make traps",
  [ID_ITEM_AXE      ]: "used to turn trees into wood for defenses",
  [ID_ITEM_FLARE    ]: "immediately summons the next vendor & attack",
  [ID_ITEM_AIRSTRIKE]: "removes trees and enemies where indicated",
  [ID_ITEM_PC       ]: "used to make automatic turret traps",
  [ID_ITEM_BOOK     ]: "makes bulk deals available from vendors",
  [ID_TRAP_WALL     ]: "can funnel enemies towards more lethal traps",
  [ID_TRAP_PISTON   ]: "this inexpensive trap stabs in a given direction",
  [ID_TRAP_SWINGER  ]: "this trap shoots farther, wider, and  faster",
  [ID_TRAP_BLASTER  ]: "similar to the piston trap, but longer range",
  [ID_TRAP_AUTO     ]: "this automatic turret freely rotates and fires",
};
const trap_to_recipe = {
  [ID_TRAP_WALL     ]: { [ID_ITEM_WOOD]:  5, [ID_ITEM_SCREW]:  1, [ID_ITEM_PC]: 0 },
  [ID_TRAP_PISTON   ]: { [ID_ITEM_WOOD]: 15, [ID_ITEM_SCREW]:  3, [ID_ITEM_PC]: 0 },
  [ID_TRAP_SWINGER  ]: { [ID_ITEM_WOOD]: 20, [ID_ITEM_SCREW]:  8, [ID_ITEM_PC]: 0 },
  [ID_TRAP_BLASTER  ]: { [ID_ITEM_WOOD]: 35, [ID_ITEM_SCREW]: 15, [ID_ITEM_PC]: 0 },
  [ID_TRAP_AUTO     ]: { [ID_ITEM_WOOD]: 50, [ID_ITEM_SCREW]: 40, [ID_ITEM_PC]: 1 },
};

const ItemBox = kind({
  classes: 'item-box-parent',
  iid: ID_NONE,
  enable_tooltips: true,
  components: [
    {
      kind: Button,
      classes: 'item-box',
      components: [
        { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
        { name: 'count', classes: "item-box-count" },
      ],
    },
    { name: 'tooltip', classes: 'item-box-tooltip', tag: 'span' },
  ],
  bindings: [
    { from: "count", to: "$.img.showing", transform: count => count > 0 },
    { from: "count", to: "$.count.showing", transform: count => count > 0 },
    { from: 'iid', to: '$.img.src', transform: iid => `assets/${id_to_slug[iid]}.svg` },
    { from: 'iid', to: '$.img.alt', transform: iid => id_to_slug[iid] },
    { from: 'iid', to: '$.img.style'  , transform: iid => 'visibility: ' + ((iid == ID_NONE) ? 'hidden' : 'visible') },
    { from: 'iid', to: '$.count.style', transform: iid => 'visibility: ' + ((iid == ID_NONE) ? 'hidden' : 'visible') },
    { from: 'iid', to: '$.tooltip.showing', transform(iid) { return this.get('enable_tooltips') && iid != ID_NONE } },
    { from: 'iid', to: '$.tooltip.content', transform: iid => id_to_name[iid].toUpperCase() + ': ' + id_to_desc[iid] },
    { from: 'count', to: '$.count.content' },
  ],
});
const InvItemBox = kind({
  kind: ItemBox,
  bindings: [{ from: 'model.id', to: 'iid' }],
  handlers: { ontap: 'on_tap' },
  on_tap() {
    const id = this.get('model.id');
    if (id == ID_ITEM_AXE || id == ID_ITEM_AIRSTRIKE)
      this.app.set('placing', id);
    if (id == ID_ITEM_FLARE) {
      const timers = this.get("app.timers");

      /* probably a silly way to filter out axes but meh */
      let nearest;
      for (let i = 0; i < timers.length; i++) {
        const j = timers.length - 1 - i;
        if (timers[j].text == "vendor" ||
            timers[j].text == "enemies") {
          nearest = j;
          break;
        }
      }

      const soon = Math.floor(TPS*2.5);
      for (let i = 0; i < timers.length; i++) {
        if (timers[i].text == "vendor" ||
            timers[i].text == "enemies") {
          timers[i].ticks = soon;
        }
      }

      const inv = this.get("app.inv");
      inv.set(id, inv.get(id) - 1);
    }
  },
	create() {
		this.inherited(arguments);
    const id = this.get('model.id');
    if (id != ID_NONE)
      this.binding({ from: 'app.inv.' + id, to: 'count' });
  }
});

const TrapBox = kind({
  kind: Button,
  components: [
    { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
  ],
  bindings: [
    { from: 'model.id', to: '$.img.src', transform: id => `assets/${id_to_slug[id]}.svg` },
    { from: 'model.id', to: '$.img.alt', transform: id => id_to_slug[id] },
  ],
  selectedChanged() {
    const selected = this.get('selected');
    const trap_id = this.get('model.id');

    let classes = 'enyo-tool-decorator trap-box';

    if (selected)
      classes += ' trap-box-selected';
    else if (can_afford(this.get('app.inv'), trap_to_recipe[trap_id]))
      classes += ' trap-box-affordable';

    this.set('classes', classes);
  },
	create() {
		this.inherited(arguments);

    for (const key in trap_to_recipe[this.get("model.id")])
      this.observe('app.inv.' + key, this.selectedChanged, this);

    this.selectedChanged();
  }
});

const TrapMenu = kind({
  name: "TrapMenu",
  handlers: { ontap: 'on_tap' },
  selected_trap: ID_TRAP_WALL,
  components: [
    { content: "traps", classes: "section-header" },
    {
      /* TODO: DataRepeater has a whole lot of code in it for handling
       * the selection; I should probably make use of it instead of rolling my own */
      kind: DataRepeater,
      components: [ {
        kind: TrapBox, 
        bindings: [{
          from: 'owner.selected_trap',
          to: 'selected',
          transform(selected) { return selected == this.get('model.id') }
        }],
      } ],
      collection: new Collection([
        { id: ID_TRAP_WALL     },
        { id: ID_TRAP_PISTON   },
        { id: ID_TRAP_SWINGER  },
        { id: ID_TRAP_BLASTER  },
        { id: ID_TRAP_AUTO     },
      ])
    },
    { name: "trap_name", classes: "section-subheader" },
    { name: "info", classes: "section-info", allowHtml: true },
    {
      classes: "section-info",
      style: "margin-top: 1em; margin-bottom: 0.5em;",
      content: "<b>INGREDIENTS:</b>",
      allowHtml: true,
    },
    {
      classes: 'recipe-ingredient-list',
      components: [
        {
          kind: DataRepeater,

          name: "recipe",
          classes: "section-info",
          components: [
            {
              /* hide if empty */
              bindings: [ { from: "model.amount", to: "showing", transform: x => !!x } ],
              components: [
                {
                  tag: "img",
                  classes: "recipe-ingredient-img",
                  bindings: [
                    { from: "owner.model.ingredient", to: "attributes.src", transform: id => `assets/${id_to_slug[id]}.svg` },
                  ],
                },
                {
                  tag: "span",
                  bindings: [
                    { from: "owner.model.ingredient", to: "ingredient" },
                    { from: "owner.model.amount"    , to: "amount"     },
                  ],
                  /* bind the appropriate ingredient in the inventory to "inv_has" */
                  ingredientChanged() {
                    this.binding({ from: 'app.inv.' + this.get("ingredient"), to: 'inv_has' });
                  },
                  observers: [{ method: 'rerender', path: [ "inv_has", "amount" ] }],
                  rerender() {
                    const id  = this.get("ingredient");
                    const amt = this.get("amount");
                    this.set('content', `- x${amt} ${id_to_name[id]}`);

                    let classes = "recipe-ingredient-span";
                    if (this.get("inv_has") < amt)
                      classes += ' recipe-ingredient-span-missing';
                    this.set('classes', classes);
                  },
                }
              ],
            }
          ],
          bindings: [
            {
              from: "owner.selected_trap",
              to: "collection",
              transform: trap_id => Object
                .entries(trap_to_recipe[trap_id])
                .map(([ingredient, amount]) => ({ ingredient, amount }))
            }
          ],
        },
        {
          kind: Button,
          content: "CRAFT",
          classes: 'recipe-buy-button',
          attributes: { tabindex: "-1" },

          bindings: [{ from: "owner.selected_trap", to: "makes_trap" }],
          makes_trapChanged(was, is) {
            for (const key in trap_to_recipe[is])
              this.observe('app.inv.' + key, this.rerender, this);

            this.rerender();
          },

          handlers: { ontap: 'on_tap' },
          on_tap() {
            this.app.set("placing", this.get("makes_trap"));
          },
          rerender() {
            const recipe = trap_to_recipe[this.get("makes_trap")];
            const inv = this.get('app.inv');
            this.setAttribute("disabled", !can_afford(inv, recipe));
          }
        },
      ]
    }
  ],
  bindings: [
    { from: "selected_trap", to: "$.trap_name.content", transform: id => id_to_name[id] },
    { from: "selected_trap", to: "$.info.content",      transform: id => id_to_desc[id] },
  ],
  on_tap(sender, ev) {
    if (ev.model && ev.model.get) {
      this.set('selected_trap', ev.model.get('id'));
      for (const trap_box of this.$.dataRepeater.$.container.children)
        trap_box.set('selected', trap_box.model.get('id') == ev.model.get('id'));
    }
  },
});

const App = kind({
  name: "SandEnyoBox",
  classes: "enyo-unselectable",
  style: "z-index: 1",
  components: [
    {
      tag: "canvas",
      style: "z-index: -1; position: absolute",
    },
    {
      classes: "sidebar sidesidebar",
      bindings: [
        /* referencing these directly in the computed property doesn't work, so we copy them in and never use them */
        { from: "app.game_over",         to: "game_over" },
        { from: "app.vendor_stay_ticks", to: "vendor_stay_ticks" },

        { from: "app.vendoring", to: "vendoring" },
        { from: "app.placing",   to: "placing" },
      ],
      computed: [
        { method: "set_styles", path: [ "game_over", "vendor_stay_ticks", "vendoring", "placing" ] },
      ],
      set_styles() {
        let styles = "";
        {
          if (!this.get("app.vendoring")) styles += "height: fit-content; ";
          if ( this.get("app.placing")  ) styles += "filter: opacity(30%); pointer-events: none; ";

          const showing = !this.app.get("game_over") && (this.app.get("vendor_stay_ticks") > 0);
          if (!showing) styles += "display: none;";
        }
        this.set("style", styles);

        let classes = "sidebar sidesidebar";
        {
          const vendoring = this.get("vendoring");
          const stay_ticks = this.app.get("vendor_stay_ticks");
          if (!vendoring) {
            if (     stay_ticks < Math.floor(TPS*3))
              classes += " vendor-panic-hard";
            else if (stay_ticks < Math.floor(TPS*5))
              classes += " vendor-panic";
          }
        }
        this.set("classes", classes);
      },
      components: [
        {
          classes: "vendor-top-bar",
          components: [
            { tag: "span", content: "vendor", classes: "section-header" },
            {
              classes: "section-info",
              bindings: [
                { from: "app.vendoring",          to: "showing", transform: p => !p },
                { from: "app.vendor_stay_ticks", to: "content", transform: t => "0:" + (''+Math.floor(t/TPS)).padStart(2, '0') }
              ]
            },
            {
              kind: Button,
              content: "ACCEPT",
              bindings: [
                { from: "app.vendoring",          to: "showing", transform: p => !p },
              ],
              handlers: { ontap: 'on_tap' },
              on_tap() {
                const app = this.app;
                app.set("placing", ID_NONE);
                app.set("vendoring", 1);

                function screwball() {
                  const ret = [
                    { cost:  3, count: 2, id: ID_ITEM_SCREW },
                    { cost: 10, count: 1, id: ID_ITEM_AXE   },
                  ]
                  if (Math.random() < 0.1)
                    ret.push({ cost: 10, count: 1, id: ID_ITEM_FLARE     });
                  if (Math.random() < 0.05)
                    ret.push({ cost: 20, count: 1, id: ID_ITEM_AIRSTRIKE });
                  if (app.inv[ID_ITEM_BOOK] > 0)
                    ret.push({ cost: 20, count: 30, id: ID_ITEM_SCREW });

                  return {
                    inventory: ret,
                    name: "screwball",
                    desc: "rumored to be an axe murderer"
                  }
                }

                function survivalist() {
                  const ret = [
                    { cost:  8, count: 1, id: ID_ITEM_AXE   },
                    (Math.random() < 0.5)
                      ? { cost: 20, count: 1, id: ID_ITEM_AIRSTRIKE }
                      : { cost: 10, count: 1, id: ID_ITEM_FLARE     }
                  ]

                  const has_book = app.inv[ID_ITEM_BOOK] > 0;
                  if (!has_book && Math.random() < 0.05)
                    ret.push({ cost: 99, count: 1, id: ID_ITEM_BOOK });

                  if (Math.random() < 0.1 || has_book)
                    ret.push({ cost: 40, count: 1, id: ID_ITEM_PC });

                  if (has_book)
                    ret.push({ count: 3, count: 2, id: ID_ITEM_AXE });

                  return {
                    inventory: ret,
                    name: "the survivalist",
                    desc: "he's eaten some things he probably shouldn't have"
                  }
                }

                function tinkerer() {
                  const ret = [
                    { cost: 13, count: 10, id: ID_ITEM_SCREW },
                    { cost: 20, count: 1, id: ID_ITEM_AIRSTRIKE },
                    { cost: 40, count: 1, id: ID_ITEM_PC }
                  ]
                  const has_book = app.inv[ID_ITEM_BOOK] > 0;
                  if (!has_book && Math.random() < 0.07)
                    ret.push({ cost: 50, count: 1, id: ID_ITEM_BOOK });
                  if (has_book) {
                    ret.push({ cost: 40, count: 50, id: ID_ITEM_SCREW     });
                    ret.push({ cost: 40, count:  3, id: ID_ITEM_AIRSTRIKE });
                  }

                  return {
                    inventory: ret,
                    name: "the tinkerer",
                    desc: "he's sorry about all the killer robots"
                  }
                }

                const vendors_seen = app.get("vendors_seen");
                const choose = arr => arr[Math.floor(Math.random() * arr.length)];
                let vendor_fn;

                if (vendors_seen == 0)
                  vendor_fn = screwball;
                else if (vendors_seen == 1)
                  vendor_fn = survivalist;
                else if (vendors_seen == 2)
                  vendor_fn = screwball;
                else if (vendors_seen < 5)
                  vendor_fn = choose([screwball, survivalist]);
                else
                  vendor_fn = choose([screwball, survivalist, tinkerer]);

                app.set("vendors_seen", vendors_seen + 1);
                this.app.set("vendor_data", vendor_fn());
              },
              style: "height: 2.0em",
              classes: 'recipe-buy-button',
            }
          ]
        },
        {
          bindings: [{ from: "app.vendoring", to: "showing" }],
          components: [
            {
              kind: DataRepeater,
              bindings: [{ from: "app.vendor_data", to: "collection", transform: vd => vd.inventory }],
              components: [
                {
                  classes: 'vendor-good-div',
                  components: [
                    { kind: ItemBox, enable_tooltips: false, bindings: [
                      { from: "owner.model.count", to: "count" },
                      { from: "owner.model.id"   , to: "iid" }
                    ]},
                    {
                      bindings: [{ from: "owner.model.id", to: "content", transform: id => id_to_desc[id] }],
                      classes: "section-info",
                      style: "font-size: 0.75em; width: 9em;"
                    },
                    {
                      kind: Button,
                      bindings: [
                        { from: "app.money", to: "can_afford",
                          transform(money) { return this.get("owner.model.cost") > money; } }
                      ],
                      can_affordChanged(was, is) {
                        /* TODO: why doesn't writing directly to "disabled" work? */
                        this.setAttribute("disabled", is);
                      },
                      components: [
                        { tag: 'span', classes: "section-header", style: "margin-right: 0.3em",
                          bindings: [{ from: "owner.model.cost", to: "content", }] },
                        {
                          tag: "img",
                          classes: "recipe-ingredient-img",
                          attributes: { src: "assets/money.svg" },
                        },
                     ],
                     handlers: { ontap: 'on_tap' },
                     on_tap() {
                       const cost = this.get("owner.model.cost");
                       const count = this.get("owner.model.count");
                       const id = this.get("owner.model.id");
                       this.set('app.money', this.get('app.money') - cost);
                       const inv = this.get('app.inv');
                       inv.set(id, inv.get(id) + count);
                       // this.owner.render();
                     },
                     classes: 'recipe-buy-button vendor-buy-button',
                     style: "font-size: 0.8em;",
                     attributes: { tabindex: "-1" },
                    }
                  ]
                }
              ]
            },
            { content: "<br>", allowHtml: true },
            {
              style: "display: flex; align-items: center;",
              components: [
                {
                  classes: "section-info",
                  style: "margin-right: 1.5em;",
                  components: [
                    {
                      classes: "section-subheader",
                      bindings: [{ from: "app.vendor_data", to: "content", transform: vd => vd.name }],
                    },
                    {
                      bindings: [{ from: "app.vendor_data", to: "content", transform: vd => vd.desc }],
                    },
                  ]
                },
                // { content: "<br>", allowHtml: true },
                {
                  kind: Button,
                  content: "DISMISS",
                  handlers: { ontap: 'on_tap' },
                  on_tap() {
                    this.app.set("vendoring", 0);
                    this.app.set("vendor_stay_ticks", 0);
                  },
                  style: "height: 2.0em",
                  classes: 'recipe-buy-button',
                }
              ]
            },
          ]
        }
      ]
    },
    {
      name: "ui_sidebar",
      classes: "sidebar",
      bindings: [
        { from: "app.placing", to: "style",
          transform: id => (id == ID_NONE) ? '' : "filter: opacity(30%); pointer-events: none;" },
        { from: "app.game_over", to: "showing", transform: over => !over }
      ],
      components: [
        {
          components: [
            {
              components: [
                { tag: "span", content: "inventory  ", classes: "section-header" },
                { style: "float:right;", components: [
                  {
                    tag: "img",
                    classes: "recipe-ingredient-img",
                    attributes: { src: "assets/money.svg" },
                  },
                  { tag: "span", classes: "section-header", bindings: [{ from: "app.money", to: "content" }] },
                ]}
              ]
            },
            {
              kind: DataRepeater,
              classes: "item-box-div",
              components: [ { kind: InvItemBox } ],
              collection: [
                ID_ITEM_WOOD     , ID_ITEM_SCREW    , ID_ITEM_AXE      , ID_ITEM_FLARE    ,
                ID_ITEM_AIRSTRIKE, ID_ITEM_PC       , ID_NONE          , ID_NONE          ,
              /* if you don't wrap them in objects, ID_NONE gets filtered out (because falsey?) */
              ].map(id => ({ id })),
            }
          ]
        },
        { content: "<br>", allowHtml: true },
        { kind: TrapMenu, name: 'trap_menu' },
      ],
    },
    {
      style: "position: absolute; top: 0em; left: 0.5em; pointer-events: none;",
      bindings: [ { from: "app.game_over", to: "showing" } ],
      components: [
        {
          classes: "section-header",
          style: "color: black;",
          content: "game over",
        },
      ]
    },
    {
      style: "position: absolute; top: 0em; left: 0.5em; pointer-events: none;",
      bindings: [ { from: "app.placing", to: "showing", transform: id => id != ID_NONE } ],
      components: [
        {
          classes: "section-header",
          style: "color: black;",
          content: "press escape to cancel",
        },
        {
          tag: "img",
          classes: "recipe-ingredient-img",
          bindings: [{ from: "app.placing", to: "attributes.src", transform: id => `assets/${id_to_slug[id]}.svg` }]
        },
        {
          tag: "span",
          bindings: [{ from: "app.placing", to: "content", transform: id => ' placing ' + id_to_name[id] }],
          style: "font-family: monospace; font-size: 1.5em; position: relative; bottom: 0.2em;"
        },
      ]
    },
    {
      classes: "time-queue-container",
      name: "time_queue",
      allowHtml: true,
      contents: '',
    }
  ]
});

ready(function() {
  const app = new EnyoApplication({
    placing: ID_NONE,
    vendoring: false,
    vendor_data: { name: "null", desc: "void", inventory: [] },
    vendors_seen: 0,
    vendor_stay_ticks: 0,
    game_over: false,
    hp: 9,
    timers: [
      { time: 1, ticks: 10*TPS, text: "enemies", icon: "wave" },
      { time: 1, ticks:  5*TPS, text: "vendor", icon: "vendor" },
      // { time: "1:35", text: "enemies",  icon: "wave",   },
      // { time: "0:40", text: "vendor",   icon: "vendor", },
      // { time: "0:01", text: "axe done", icon: "axe",    }
    ],
    money: 10,
    inv: new Model({
      [ID_ITEM_WOOD     ]: 1500,
      [ID_ITEM_SCREW    ]:  500,
      [ID_ITEM_AXE      ]:  2,
      [ID_ITEM_FLARE    ]:  1,
      [ID_ITEM_AIRSTRIKE]:  1,
      [ID_ITEM_PC       ]:  1,
      [ID_ITEM_BOOK     ]:  0,
      [ID_NONE          ]:  0,
    }),
    view: App
  });

  app.renderInto(document.body);
  app.inv.set(ID_ITEM_PC, 0);

  const canvas = document.getElementsByTagName("canvas")[0];
  const ctx = canvas.getContext("2d");
  (window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  })();

  /* canvas assets */
  const axe = new Image();
  axe.src = `assets/${id_to_slug[ID_ITEM_AXE]}.svg`;

  let mouse_x = 0;
  let mouse_y = 0;
  let mouse_down = 0;
  window.onkeydown = ev => {
    if (app.placing && ev.key == 'Escape')
      app.set('placing', ID_NONE);
  }
  canvas.onmousedown = () => mouse_down = 1;
  canvas.onmouseup   = () => mouse_down = 0;
  window.onmousemove = ev => {
    mouse_x = ev.pageX;
    mouse_y = ev.pageY;
  };

  const PORTAL_X = 0;
  const PORTAL_Y = 0;
  const trees = [];
  const tick_timeouts = []; /* TODO: make serializable */
  const traps = [
    { x:  0.0836, y:  0.0836, kind: ID_TRAP_WALL },
    { x: -0.0029, y: -0.2118, kind: ID_TRAP_WALL },
    { x: -0.2046, y: -0.0303, kind: ID_TRAP_WALL },
    { x: -0.0476, y: -0.0504, kind: ID_TRAP_WALL },
    { x: -0.0951, y:  0.0360, kind: ID_TRAP_WALL }
    // { x: -0.30, y: -0.20, rot: Math.PI/2, ticks: 0, kind: ID_TRAP_PISTON }
  ];
  const enemies = [];
  const axes = [];
  const projectiles = [];
  const $ = i => ({ x: traps[i].x, y: traps[i].y });
  const walls = [{ from: $(0), to: $(1) },
                 { from: $(4), to: $(2) },
                 { from: $(4), to: $(0) },
                 { from: $(4), to: $(3) },];
  function walls_stuck_out(stick_out) {
    const ret = JSON.parse(JSON.stringify(walls));
    for (const i in ret) {
      const src = walls[i];
      const dst = ret[i];
      const len = point_to_point(dst.from.x, dst.from.y,
                                 dst.  to.x, dst.  to.y);
      const t = 1 + stick_out/len;
      dst.from.x = lerp(src.  to.x, src.from.x, t);
      dst.from.y = lerp(src.  to.y, src.from.y, t);
      dst.  to.x = lerp(src.from.x, src.  to.x, t);
      dst.  to.y = lerp(src.from.y, src.  to.y, t);
    }
    return ret;
  }

  let _i = 0;
  while (trees.length < 50 && _i < 1e7) {
    _i++;
    let ret = {
      x: lerp(-0.5, 0.5, Math.random()),
      y: lerp(-0.5, 0.5, Math.random()),
      rot: Math.random() * Math.PI*2,
      seed: Math.random()
    };

    /* brute force the constraints; very monte carlo */
    for (const { x, y } of trees) {
      if (point_to_point(x, y, ret.x, ret.y) < 0.10) {
        ret = undefined;
        break;
      }
    }
    if (ret == undefined) continue;

    if (point_to_point(PORTAL_X, PORTAL_Y, ret.x, ret.y) < 0.10)
      continue;

    for (const { from, to } of walls) {
      if (point_to_line(from, to, ret.x, ret.y) < 0.06) {
        ret = undefined;
        break;
      }
    }
    if (ret == undefined) continue;

    trees.push(ret);
  }

  function find_path(start_x, start_y, end_x, end_y, ctx) {
    const POI_WALL_OUT    = 0.020; /* how far walls for POI generation are stuck out */
    const NODE_PAD        = 0.045; /* how far out control nodes are placed from POIs */
    const REGION_MAX      = 0.105*Math.PI*2; /* radians around POI per control node */
    const NODE_WALL_OUT   = 0.001; /* how far walls for node-in-wall prefilter are stuck out */
    const NODE_WALL_THICK = 0.038; /* how thick are walls for node-in-wall prefilter */
    const COMBINE_DIST    = 0.025; /* how close together nodes need to be to be joined */
    const WALL_THICK      = 0.038; /* proximity to post/wall beneath which a visibility path gets filtered out */
    const VIS_WALL_OUT    = 0.005; /* how far walls for visibility checks are stuck out */

    const pois = new Map();
    let control_nodes = [];
    const key = pt => Math.floor(pt.x * 1000) + ',' + Math.floor(pt.y * 1000);

    for (const { from, to } of walls.concat(walls_stuck_out(POI_WALL_OUT))) {
      const from_key = key(from);
      const   to_key = key(  to);
      if (!pois.has(from_key)) pois.set(from_key, { pt: from, connects: [] });
      if (!pois.has(  to_key)) pois.set(  to_key, { pt:   to, connects: [] });

      pois.get(from_key).connects.push(  to);
      pois.get(  to_key).connects.push(from);
    }
    for (let poi of pois.values()) {
      let { pt, connects } = poi;
      const node_regions = connects.map(ct => {
        const delta_x = ct.x - pt.x;
        const delta_y = ct.y - pt.y;
        const atan2 = Math.atan2(delta_y, delta_x);
        if (atan2 < 0) return Math.PI*2 + atan2;
        return atan2;
      });
      node_regions.sort((a, b) => a - b);

      const split_regions = [];
      // const artificial_regions = new Set();
      for (let i = 0; i < node_regions.length; i++) {
        let rad = node_regions[i];
        let next = node_regions[i+1];
        if (next == undefined) next = Math.PI*2 + node_regions[0];

        split_regions.push(rad);
        const delta = (next - rad);
        if (delta > REGION_MAX) {
          const new_regions = Math.ceil(delta/REGION_MAX); /* one more than actual new region count */
          for (let i = 1; i < new_regions; i++) {
            const artificial = lerp(rad, next, i/new_regions);
            // artificial_regions.add(artificial);
            split_regions.push(artificial);
          }
        }
      }

      if (DEBUG_VIS && ctx && 0) for (const theta of split_regions) {
        const dist = 0.07;
        // const theta = theta;
        const node_x = pt.x + Math.cos(theta) * dist;
        const node_y = pt.y + Math.sin(theta) * dist;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(node_x, node_y);
        ctx.lineWidth = 0.005;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "magenta";
        ctx.stroke();
      }

      /* write into control_nodes */
      for (let i = 0; i < split_regions.length; i++) {
        let this_rad = split_regions[i];
        let next_rad = split_regions[i+1];
        if (next_rad == undefined) next_rad = Math.PI*2 + split_regions[0];

        const theta = (this_rad + next_rad)/2;
        let cornerness = inv_lerp(Math.PI*2*0.16, 0, next_rad - this_rad);
        cornerness = Math.max(0, cornerness, Math.min(1, cornerness));
        const dist = NODE_PAD * lerp(0.5, 2, cornerness);
        const node_x = pt.x + Math.cos(theta) * dist;
        const node_y = pt.y + Math.sin(theta) * dist;

        control_nodes.push({ x: node_x, y: node_y, connects: [] });
        if (DEBUG_VIS && ctx && 0) {
          ctx.beginPath();
          ctx.globalAlpha = lerp(0.2, 1, cornerness);
          const size = 0.07;
          ctx.arc(node_x, node_y, size*0.2, 0, Math.PI*2);
          ctx.fillStyle = "pink";
          ctx.fill();
        }
      }
    }

    /* filter out nodes that are inside of walls */
    const node_walls = walls_stuck_out(NODE_WALL_OUT);
    control_nodes = control_nodes.filter(n => {
      for (const { from: l, to: r } of node_walls) {
        const dist = point_to_line(l, r, n.x, n.y);
        if (dist < NODE_WALL_THICK)
          return false;
      }

      return true;
    });

    /* combine close together nodes */
    while (true) {
      let closest_pair;
      let closest_dist = COMBINE_DIST;
      for (const o of control_nodes)
        for (const p of control_nodes) {
          if (o == p) continue;

          const dist = point_to_point(o.x, o.y, p.x, p.y);
          if (dist < closest_dist) {
            closest_pair = [o, p];
            closest_dist = dist;
          }
        }
      if (closest_pair) {
        const [o, p] = closest_pair;
        control_nodes.splice(control_nodes.indexOf(o), 1);
        control_nodes.splice(control_nodes.indexOf(p), 1);
        control_nodes.push({
          x: lerp(o.x, p.x, 0.5),
          y: lerp(o.y, p.y, 0.5),
          connects: []
        });
      }
      else
        break;
    }

    if (DEBUG_VIS && ctx) for (const { x: node_x, y: node_y } of control_nodes) {
      const size = 0.07;
      ctx.beginPath();
      ctx.globalAlpha = 0.2;
      ctx.arc(node_x, node_y, size*0.2, 0, Math.PI*2);
      ctx.fillStyle = "magenta";
      ctx.fill();
    }

    let start, end;
    control_nodes.push(start = { x: start_x, y: start_y, connects: [] });
    control_nodes.push(  end = { x:   end_x, y:   end_y, connects: [] });

    const pairs = [];
    const vis_walls = walls_stuck_out(VIS_WALL_OUT);
    for (const from of control_nodes)
      for (const to of control_nodes) {
        if (from == to) continue;

        let push = true;
        for (const { from: l, to: r } of pairs) {
          if ((l == from || l == to) &&
              (r == from || r == to)) {
            push = false;
            break;
          }
        }

        let hit = false;
        for (const { from: l, to: r } of vis_walls) {
          const dist = line_to_line(l, r, from, to);
          if (dist < WALL_THICK) {
            push = false;
            hit = true;
            break;
          }
        }

        if (DEBUG_VIS && ctx) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(  to.x,   to.y);
          ctx.lineWidth = 0.01;
          ctx.globalAlpha = hit ? 0.01 : 0.04;
          ctx.strokeStyle = hit ? "green" : "blue";
          ctx.stroke();
        }

        if (push) {
          from.connects.push(  to);
            to.connects.push(from);
          pairs.push({ from, to });
        }
      }

    const frontier = [];
    const came_from = new Map();
    const cost_from = new Map();
    frontier.push(start);
    came_from.set(start, "start");
    cost_from.set(start, 0);
    while (frontier.length) {
      const current = frontier.shift();
      if (current == end) break;

      for (const next of current.connects) {
        const dist = point_to_point(current.x, current.y, next.x, next.y);
        const next_cost = cost_from.get(current) + dist;
        if (!cost_from.has(next) || next_cost < cost_from.get(next)) {
          frontier.push(next);
          frontier.sort((a, b) => cost_from.get(a) - cost_from.get(b));
          cost_from.set(next, next_cost);
          came_from.set(next, current);
        }
      }
    }

    const ret = [];
    for (let n = end; came_from.get(n) != "start"; n = came_from.get(n)) {
      const from = n;
      let     to = came_from.get(n);
      if (to == "start") to = start;
      if (to == undefined) break;

      ret.push({ from, to });
    }

    if (DEBUG_VIS && ctx) {
      ctx.globalAlpha = 0.8;
      for (const { from, to } of ret) {
        const WALL_THICK = 0.03;
        const WALL_COLOR = "#a6656d";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(  to.x,   to.y);
        ctx.lineWidth = WALL_THICK;
        ctx.strokeStyle = WALL_COLOR;
        ctx.stroke();
      }
    }

    return ret.reverse().map(x => x.from);
  }

  let screen_to_world;
  function tick() {
    // if (screen_to_world) {
    //   let mouse = new DOMPoint(mouse_x, mouse_y, 0, 1).matrixTransform(screen_to_world);
    // }
    const cleanups = [];

    for (const tt of tick_timeouts) {
      tt.ticks--;
      if (tt.ticks == 0) {
        tt.fn();
        cleanups.push(() => tick_timeouts.splice(tick_timeouts.indexOf(tt), 1));
      }
    }

    app.timers.sort((a, b) => b.ticks - a.ticks);

    {
      const vlt = app.get("vendor_stay_ticks");
      if (vlt) app.set("vendor_stay_ticks", vlt - 1);
    }

    let tq_html = '';
    for (const t of app.timers) {
      t.ticks--;

      tq_html += '<div style="margin-top: 0.6em">';
        tq_html += '<span class="time-queue-time">';
          let secs = Math.floor(t.ticks / TPS);
          secs = (''+secs).padStart(2, '0');
          tq_html += '0:' + secs + ' ';
        tq_html += '</span>';
        tq_html += `<img class="time-queue-icon" src="assets/${t.icon}.svg">`;
        tq_html += '<span class="time-queue-desc">';
          tq_html += ' ' + t.text;
        tq_html += '</span>';
      tq_html += '</div>';

      if (t.ticks <= 0) {
        cleanups.push(() => app.timers.splice(app.timers.indexOf(t), 1));

        /* TODO: enum */
        if (t.text == "enemies") {
          if (window.wave_size == undefined)
            window.wave_size = 4;
          else
            window.wave_size++;

          let enemy_count = 0;
          console.log(`spawning wave of ${window.wave_size} enemies`);
          (function enemy() {
            const spawn_point = trees[Math.floor(Math.random()*trees.length)]
            if (spawn_point == undefined) {
              alert("well done, you beat the game!");
              return;
            }

            enemy_count++;
            if (enemy_count <= window.wave_size)
              tick_timeouts.push({ fn: enemy, ticks: Math.floor(0.8*TPS) });

            const { x, y } = spawn_point;

            let hp = 1;
                 if (window.wave_size > 20) hp += Math.floor(Math.random() * 1.3),
                                            hp += Math.floor(Math.random() * 1.3);
            else if (window.wave_size > 15) hp += Math.floor(Math.random() * 1.2),
                                            hp += Math.floor(Math.random() * 1.2);
            else if (window.wave_size > 10) hp += Math.floor(Math.random() * 1.2);
            enemies.push({ x, y, ticks: 0, hp, max_hp: hp });
          })();

          cleanups.push(() => {
            app.timers.push({ time: 1, ticks: 10*TPS, text: "enemies", icon: "wave" });
          });
        }

        if (t.text == "vendor") {
          app.set("vendor_stay_ticks", 10*TPS);
          cleanups.push(() => {
            app.timers.push({ time: 1, ticks: 60*TPS, text: "vendor", icon: "vendor" });
          });
        }

        if (t.text == "axe done") {
          const inv = app.inv;
          inv.set(ID_ITEM_AXE, inv.get(ID_ITEM_AXE) + 1);
          inv.set(ID_ITEM_WOOD, inv.get(ID_ITEM_WOOD) + Math.floor(lerp(3, 5, Math.random())));
        }
      }
    }
    const tq = app.get("$.sandEnyoBox.$.time_queue");
    tq.set("content", tq_html);

    const kill_p = p => cleanups.push(() => projectiles.splice(projectiles.indexOf(p), 1));
    const kill_e = e => cleanups.push(() => enemies    .splice(enemies    .indexOf(e), 1));
    const _walls = walls_stuck_out(0.04);
    for (const p of projectiles) {

      p.ticks++;
      let JOURNEY_TICKS = 0.5 * TPS;
      if (p.kind == ID_TRAP_SWINGER) JOURNEY_TICKS = 1.0 * TPS;
      if (p.kind == ID_TRAP_BLASTER) JOURNEY_TICKS = 1.4 * TPS;
      if (p.kind == ID_TRAP_AUTO   ) JOURNEY_TICKS = 1.6 * TPS;

      if (p.ticks > JOURNEY_TICKS) { kill_p(p); continue; }

      /* quadratic perf goes weee */
      for (const e of enemies) {
        const dist = point_to_point(p.x, p.y, e.x, e.y);
        if (dist < 0.02) {
          kill_p(p);
          e.hp--;
          if (e.hp == 0) {
            kill_e(e);
            app.set('money', app.get('money')+1);
          }
          break;
        }
      }
      
      const next_p = { x: p.x + p.vx * 0.003,
                       y: p.y + p.vy * 0.003 };
      for (const { from, to } of _walls)
        if (line_hits_line(from, to, next_p, p))
          kill_p(p);
      p.x = next_p.x;
      p.y = next_p.y;
    }

    let calced_path = false;
    for (const e of enemies) {
      e.ticks++;
      const UNITS_PER_TICK = 0.001;

      if (e.path == undefined) {
        if (!calced_path) {
          calced_path = true;
          console.log("calced path");
          e.path = find_path(e.x, e.y, PORTAL_X, PORTAL_Y);
        }
        else
          continue;
      }
      if (e.path.length == 0) continue;

      let next, dist;
      do {
        next = e.path[0];
        dist = point_to_point(e.x, e.y, next.x, next.y);
        if (dist < 0.001) {
          e.path.shift();
        }
        else break;
      } while (e.path.length);

      for (const t of traps) if (t.kind != ID_TRAP_WALL) {
        const dist = point_to_point(t.x, t.y, e.x, e.y);
        if (dist < 0.03) {
          cleanups.push(() => traps.splice(traps.indexOf(t), 1));
          break;
        }
      }

      /* HONEY I'M HOOOOOME */
      if (e.path.length == 0) {
        app.set("hp", app.get("hp") - 1);
        if (app.get("hp") == 0)
          app.set("placing", ID_NONE),
          app.set("game_over", true);
        kill_e(e);
        continue;
      }

      let delta_x = (next.x - e.x) / dist;
      let delta_y = (next.y - e.y) / dist;
      let move_x = delta_x * UNITS_PER_TICK;
      let move_y = delta_y * UNITS_PER_TICK;

      e.x += move_x;
      e.y += move_y;
    }

    for (const a of axes) {
      const UNITS_PER_TICK = 0.002;

      if (a.tree.being_chopped || trees.indexOf(a.tree) == -1)
        cleanups.push(a => {
          axes.splice(axes.indexOf(a), 1);

          const key = ID_ITEM_AXE;
          const inv = app.inv;
          inv.set(key, inv.get(key) + 1);
        });

      if (a.path == undefined) {
        a.path = find_path(a.x, a.y, a.tree.x, a.tree.y);
      }

      if (a.path.length == 0) continue;

      let next, dist;
      do {
        next = a.path[0];
        dist = point_to_point(a.x, a.y, next.x, next.y);
        if (dist < 0.001) {
          a.path.shift();
        }
        else break;
      } while (a.path.length);

      /* HONEY I'M HOOOOOME */
      if (a.path.length == 0) {
        cleanups.push(() => {
          const ticks = 5*TPS;
          axes.splice(axes.indexOf(a), 1);
          app.timers.push({
            time: 1, ticks,
            text: "axe done", icon: "axe",
          });
          a.tree.being_chopped = 1;
          tick_timeouts.push({
            fn: () => trees.splice(trees.indexOf(a.tree), 1),
            ticks
          });
        });
        continue;
      }

      let delta_x = (next.x - a.x) / dist;
      let delta_y = (next.y - a.y) / dist;
      let move_x = delta_x * UNITS_PER_TICK;
      let move_y = delta_y * UNITS_PER_TICK;

      a.x += move_x;
      a.y += move_y;
    }

    for (const trap of traps) {
      trap.ticks++;

      const shoot = (angle=0) => {
        const vx = -Math.cos(trap.rot+angle);
        const vy = -Math.sin(trap.rot+angle);
        projectiles.push({
          kind: trap.kind,
          vx, vy,
          x: trap.x + vx*0.025,
          y: trap.y + vy*0.025,
          rot: trap.rot,
          ticks: 0,
        });
      }

      let secs = 0.5;
      if (trap.kind == ID_TRAP_PISTON)  secs = 1.0;
      if (trap.kind == ID_TRAP_SWINGER) secs = 0.6;
      if (trap.kind == ID_TRAP_BLASTER) secs = 0.3;
      if (trap.kind == ID_TRAP_AUTO)    secs = 0.1;
      const FIRE_INTERVAL = Math.floor(TPS*secs);

      if (trap.kind == ID_TRAP_WALL) {
      }

      if (trap.kind == ID_TRAP_PISTON) {
        if ((trap.ticks % FIRE_INTERVAL) == 0)
          shoot();
      }

      if (trap.kind == ID_TRAP_SWINGER) {
        if ((trap.ticks % FIRE_INTERVAL) == 0)
          shoot(Math.sin(trap.ticks/(TPS*0.5))* 0.1*Math.PI*2);
      }

      if (trap.kind == ID_TRAP_BLASTER) {
        if ((trap.ticks % FIRE_INTERVAL) == 0)
          shoot();
      }

      if (trap.kind == ID_TRAP_AUTO && enemies.length > 0) {
        if ((trap.ticks % FIRE_INTERVAL) == 0)
          shoot();

        const nearest = enemies.reduce((best, e) => {
          const dist = point_to_point(e.x, e.y, trap.x, trap.y);
          if (best == undefined) return { dist, e };
          return (dist < best.dist) ? { dist, e } : best;
        }, undefined);

        const ideal_rot = Math.atan2(trap.y - nearest.e.y, trap.x - nearest.e.x);
        const distance = rad_distance(trap.rot, ideal_rot);
        const force = Math.min(0.04, Math.abs(distance));
        trap.rot += force*Math.sign(distance);
      }
    }

    for (const cleanup_fn of cleanups) cleanup_fn();
  }

  let last, tick_acc = 0;
  requestAnimationFrame(function frame(now) {
    requestAnimationFrame(frame);

    let dt = 0;
    if (last) dt = now - last;
    last = now;

    const TICK_MS = 1000/TPS;
    dt = Math.min(dt, TICK_MS*10);
    if (!app.get("vendoring") && !app.get("game_over"))
      tick_acc += dt;
    while (tick_acc > TICK_MS) {
      tick_acc -= TICK_MS;
      tick();
    }

    ctx.save();

    ctx.fillStyle = "#71b980";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // const width = 
    let sidebar = document.getElementById("application_sandEnyoBox_ui_sidebar");
    if (!sidebar) return;
    sidebar = sidebar.getBoundingClientRect();

    const width = (canvas.width - sidebar.width);
    const height = canvas.height;
    const cx = width/2;
    const cy = height/2;

    ctx.translate(cx, cy);
    const scale = Math.min(width, height);
    ctx.scale(scale, scale);
    // ctx.rotate(now * 0.001);
    screen_to_world = ctx.getTransform().invertSelf();

    if (0) {
      const size = 0.06;
      const x = -0.45;
      const y =  0.3;

      ctx.fillStyle = "#76609f";
      ctx.fillRect(x + size/-2, y + size/-2, size, size);
    }

    function axe_chopping(x, y, rot, size=0.05) {
      if (!axe.complete) return;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.translate(-size*0.8, -size*0.8);

      const swing = 1 + 0.6*(1 - Math.abs(Math.sin(0.005*now)));
      ctx.rotate(Math.PI/2 - swing*Math.PI);
      ctx.drawImage(axe, -size*0.8, -size*0.8, size, size);
      ctx.restore();
    }
    function axe_icon(x, y, size, opacity) {
      if (!axe.complete) return;

      ctx.globalAlpha = opacity;
      ctx.save();
      ctx.translate(x - size/4, y - size/4);
      ctx.drawImage(axe, size/-4, size/-4, size, size);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    let mouse = new DOMPoint(mouse_x, mouse_y, 0, 1).matrixTransform(screen_to_world);
    let closest = trees.reduce((a, t) => {
      const dist = point_to_point(t.x, t.y, mouse.x, mouse.y);
      if (dist < a.dist) return { t, dist };
      return a;
    }, { t: undefined, dist: 0.1 });
    for (const tree of trees) {
      const { x, y, rot, seed } = tree;
      const size = 0.04;

      if (tree.being_chopped) axe_chopping(x, y, rot);

      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i ? "#609f6d" : "#54895f" ;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot + (0.1*seed + 0.3)*Math.PI*i);
        ctx.fillRect(size/-2, size/-2, size, size);
        ctx.restore();
      }
      if (app.placing == ID_ITEM_AXE && !tree.being_chopped && !axes.some(a => a.tree == tree)) {
        const hover = (closest.t == tree);

        axe_icon(x, y, size, hover ? lerp(0.5, 1.0, 1-closest.dist/0.1) : 0.3);

        if (mouse_down && hover) {
          axes.push({ x: PORTAL_X, y: PORTAL_Y, tree });

          const key = ID_ITEM_AXE;
          const inv = app.inv;
          inv.set(key, inv.get(key) - 1);

          app.set('placing', ID_NONE);
        }
      }

    }

    // const ROAD_COLOR = i ? "#6575a6" : "#57658f";

    ctx.globalAlpha = 1;
    for (const e of enemies) {
      const { x, y, hp, path } = e;

      const size = 0.03;
      if (hp == 1) ctx.fillStyle = "#9f6060";
      if (hp == 2) ctx.fillStyle = "#6b3636";
      if (hp == 3) ctx.fillStyle = "#561c1c";
      ctx.save();
      ctx.translate(x, y);
      if (path && path.length) {
        if (e.rot == undefined) e.rot = 0;

        const ideal_rot = Math.atan2(y - path[0].y, x - path[0].x);
        const distance = rad_distance(e.rot, ideal_rot);
        const force = Math.min(0.06, Math.abs(distance));
        e.rot += force*Math.sign(distance);
        ctx.rotate(e.rot);
      }
      ctx.fillRect(size/-2, size/-2, size, size);
      ctx.restore();
    }

    {
      const x = PORTAL_X;
      const y = PORTAL_Y;
      const size = 0.04;
      const sub_size = size*0.4;

      let hp = 0;
      for (let i = 0; i <= 2; i++)
        for (let j = 0; j <= 2; j++) {
          if (hp >= app.get("hp")) continue;
          hp++;

          ctx.fillStyle = "#4c4777";
          ctx.fillRect(
            x + size*lerp(-0.5, 0.5, j/2) - sub_size/2,
            y + size*lerp(-0.5, 0.5, i/2) - sub_size/2,
            sub_size, sub_size
          );
        }
    }

    for (const { x, y } of axes) {
      axe_icon(x, y + 0.02*(1 - Math.abs(Math.sin(0.008*now))), 0.03, 1);
    }

    for (const { x, y, rot } of projectiles) {
      const size = 0.015;
      ctx.fillStyle = "#7873aa";
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillRect(size/-2, size/-2, size, size);
      ctx.restore();
    }

    const TRAP_SIZE = 0.04;
    function draw_trap(trap, hover=false) {
      const { x, y, rot, kind } = trap;

      if (trap.kind == ID_TRAP_WALL) {

        for (let i = 0; i < 2; i++) {
          const size = (!i) ? TRAP_SIZE : 0.7*TRAP_SIZE;
          ctx.beginPath();
          ctx.arc(x, y, size/2, 0, 2 * Math.PI);
          ctx.fillStyle = (!i) ? "#6f5644" : "#8a6951";
          ctx.fill();
        }
        return;
      } else {
        if (hover)
          ctx.fillStyle = "#9680bf";
        else
          ctx.fillStyle = "#76609f";
      }

      const size = TRAP_SIZE;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillRect(size/-2, size/-2, size, size);
      ctx.restore();
    }

    function draw_wall({ x: from_x, y: from_y }, { x: to_x, y: to_y }) {
      const WALL_THICK = 0.023;
      const WALL_COLOR = "#6f5644";
      ctx.beginPath();
      ctx.moveTo(from_x, from_y);
      ctx.lineTo(  to_x,   to_y);
      ctx.lineWidth = WALL_THICK;
      ctx.strokeStyle = WALL_COLOR;
      ctx.stroke();
    }

    const _walls = walls_stuck_out(0.03);
    for (const { from, to } of _walls)
      draw_wall(from, to);

    closest = walls.reduce((a, w) => {
      const dist = point_to_line(w.to, w.from, mouse.x, mouse.y);
      if (dist < a.dist) return { w, dist };
      return a;
    }, closest);
    for (const wall of walls) {
      const { from, to } = wall;
      const x = lerp(from.x, to.x, 0.5);
      const y = lerp(from.y, to.y, 0.5);

      if (wall.being_chopped) axe_chopping(x, y, Math.PI/2 - Math.atan2(from.y - to.y, from.x - to.x));

      if (app.placing == ID_ITEM_AXE && !wall.being_chopped) {
        const hover = (closest.w == wall);

        axe_icon(x, y, 0.05, hover ? lerp(0.5, 1.0, 1-closest.dist/0.1) : 0.3);

        if (mouse_down && hover) {
          const ticks = 5*TPS;
          app.timers.push({
            time: 1, ticks,
            text: "axe done", icon: "axe",
          });
          wall.being_chopped = 1;
          tick_timeouts.push({
            fn: () => {
              for (const e of enemies) e.path = undefined;
              walls.splice(walls.indexOf(wall), 1);
            },
            ticks
          });

          const key = ID_ITEM_AXE;
          const inv = app.inv;
          inv.set(key, inv.get(key) - 1);

          app.set('placing', ID_NONE);
        }
      }
    }


    if (
      app.placing == ID_TRAP_WALL ||
      app.placing == ID_TRAP_PISTON ||
      app.placing == ID_TRAP_SWINGER ||
      app.placing == ID_TRAP_BLASTER ||
      app.placing == ID_TRAP_AUTO
    ) (() => {
      const rot = 0;
      const x = mouse.x;
      const y = mouse.y;

      function finish_place() {
        const placing = app.get('placing');

        const recipe = trap_to_recipe[placing];
        const inv = app.inv;
        for (const key in recipe) {
          inv.set(key, inv.get(key) - recipe[key]);
        }

        app.set('placing', ID_NONE);
      }

      if (app.placing == ID_TRAP_WALL) {
        const posts = traps.filter(t => t.kind == ID_TRAP_WALL);

        /* (not-quite) quadratic perf goes weee */
        const pairs = [];
        const key = pt => Math.floor(pt.x * 1000) + ',' + Math.floor(pt.y * 1000);
        const in_walls = walls_stuck_out(-0.025*1.5);
        for (const from of posts) {
          const from_key = key(from);
          for (const to of posts) {
            if (from == to) continue;
            const to_key = key(to);

            let push = true;
            for (const { points: [l, r] } of pairs) {
              if ((l == from || l == to) &&
                  (r == from || r == to)) {
                push = false;
                break;
              }
            }
            for (const { from: l, to: r } of in_walls) {
              if (line_to_line(l, r, from, to) < 0.023) {
                push = false;
                break;
              }
            }
            for (const { from, to } of walls) {
              const _from_key = key(from);
              const _to_key   = key(to  );
              if ((_from_key == from_key &&   _to_key == to_key) ||
                  (  _to_key == from_key && _from_key == to_key))
              {
                push = false;
                break
              }
            }
            for (const t of trees)
              if (point_to_line(from, to, t.x, t.y) < 0.025) {
                push = false;
                break;
              }

            if (push)
              pairs.push({ points: [from, to], dist: point_to_line(from, to, x, y) });
          }
        }

        const closest = pairs.reduce((a, x) => (x.dist < a.dist) ? x : a, { dist: 0.02 });

        ctx.globalAlpha = 0.2;
        for (const e of pairs)
          if (e != closest) {
            const { points: [from, to] } = e;
            draw_wall(from, to);
          }
        ctx.globalAlpha = 1;

        if (closest.points) {
          const { points: [from, to] } = closest;
          draw_wall(from, to);

          if (mouse_down) {
            walls.push({ from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } });
            for (const e of enemies) e.path = undefined;
            finish_place();
          }
          return;
        }
      }

      {
        const draw_x = () => {
          ctx.beginPath();
          const size = 0.015;
          ctx.moveTo(x - size, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.moveTo(x + size, y - size);
          ctx.lineTo(x - size, y + size);
          ctx.lineWidth = 0.01;
          ctx.strokeStyle = "#a6656d";
          ctx.stroke();
        }
        for (const t of trees.concat(traps).concat(enemies))
          if (point_to_point(t.x, t.y, x, y) < 0.035) {
            draw_x();
            return;
          }
        for (const { from, to } of walls)
          if (point_to_line(from, to, x, y) < 0.04) {
            draw_x();
            return;
          }
      }

      if (mouse_down) {
        const placing = app.get('placing');
        traps.push({ x, y, rot, ticks: 0, kind: placing });

        finish_place();
      }

      draw_trap({ x, y, rot, kind: app.get("placing") });
    })();

    for (const trap of traps) {
      const { x, y } = trap;
      const hover = !app.placing && point_to_point(mouse.x, mouse.y, x, y) < TRAP_SIZE*2;
      if (hover && mouse_down && trap.kind != ID_TRAP_WALL)
        trap.rot = Math.atan2(y - mouse.y, x - mouse.x);

      draw_trap(trap, hover);
    }

    if (app.placing == ID_ITEM_AIRSTRIKE) {
      const BLAST_RADIUS = 0.219;

      const { x, y } = mouse;
      ctx.beginPath();
      ctx.arc(x, y, BLAST_RADIUS, 0, 2 * Math.PI);
      ctx.strokeStyle = "#a6656d";
      ctx.lineWidth = 0.01;
      ctx.setLineDash([0.05, 0.05]);
      ctx.stroke();
      ctx.setLineDash([0]);

      if (mouse_down) {
        /* quadratic perf goes weee */
        for (const e of enemies) {
          const dist = point_to_point(x, y, e.x, e.y);
          if (dist < BLAST_RADIUS*1.1) {
            if (Math.random() < 0.3) app.set('money', app.get('money')+1);
            setTimeout(() => enemies.splice(enemies.indexOf(e), 1));
          }
        }

        for (const t of trees) {
          const dist = point_to_point(x, y, t.x, t.y);
          if (dist < BLAST_RADIUS*0.9) {
            app.set('inv.' + ID_ITEM_WOOD, app.get('inv.' + ID_ITEM_WOOD)+1)
            setTimeout(() => trees.splice(trees.indexOf(t), 1));
          }
        }

        app.set('inv.' + ID_ITEM_AIRSTRIKE, app.get('inv.' + ID_ITEM_AIRSTRIKE)-1)
        app.set("placing", ID_NONE);
      }
    }

    if (0) find_path(mouse.x, mouse.y, PORTAL_X, PORTAL_Y, ctx);

    ctx.restore();
  });

  console.log('Hello World!');
});
