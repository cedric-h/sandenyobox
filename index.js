// vim: sw=2 ts=2 expandtab smartindent ft=javascript

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
function point_to_point2(x0, y0, x1, y1) {
  return Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2);
}
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
  [ID_TRAP_PISTON   ]: { [ID_ITEM_WOOD]: 10, [ID_ITEM_SCREW]:  5, [ID_ITEM_PC]: 0 },
  [ID_TRAP_SWINGER  ]: { [ID_ITEM_WOOD]: 15, [ID_ITEM_SCREW]: 10, [ID_ITEM_PC]: 0 },
  [ID_TRAP_BLASTER  ]: { [ID_ITEM_WOOD]: 25, [ID_ITEM_SCREW]: 30, [ID_ITEM_PC]: 0 },
  [ID_TRAP_AUTO     ]: { [ID_ITEM_WOOD]: 50, [ID_ITEM_SCREW]: 90, [ID_ITEM_PC]: 1 },
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
        if (timers.at(j).get("text") == "vendor" ||
            timers.at(j).get("text") == "enemies") {
          nearest = j;
          break;
        }
      }

      const soon = Math.floor(TPS*2.5);
      for (let i = 0; i < timers.length; i++) {
        if (timers.at(i).get("text") == "vendor" ||
            timers.at(i).get("text") == "enemies") {
          timers.at(i).set("ticks", soon);
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
      bindings: [{ from: "app.vendoring", to: "showing" }],
      components: [
        { tag: "span", content: "vendor", classes: "section-header" },
        {
          kind: DataRepeater,
          collection: [
            { cost:  3, count: 2, id: ID_ITEM_SCREW },
            { cost: 10, count: 1, id: ID_ITEM_AXE },
            { cost: 20, count: 1, id: ID_ITEM_AIRSTRIKE },
            { cost: 10, count: 1, id: ID_ITEM_FLARE },
            { cost: 40, count: 1, id: ID_ITEM_PC }
          ],
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
                { classes: "section-subheader", content: "the survivalist" },
                { content: "he's eaten some things he probably shouldn't have" },
              ]
            },
            // { content: "<br>", allowHtml: true },
            {
              kind: Button,
              content: "DISMISS",
              handlers: { ontap: 'on_tap' },
              on_tap() {
                this.app.set("vendoring", 0);
              },
              style: "height: 2.0em",
              classes: 'recipe-buy-button',
            }
          ]
        },
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
      components: [
        {
          kind: DataRepeater,
          name: "time_queue",
          bindings: [{ from: "app.timers", to: "collection" }],
          components: [{
            style: "margin-top: 0.6em",
            // bindings: [{ from: "model.time", to: "showing", transform: t => t > 0 }],
            components: [
              {
                tag: "span",
                bindings: [{ from: "owner.model.time", to: "content", transform: x => x + ' ' }],
                classes: "time-queue-time"
              },
              {
                tag: "img",
                classes: "time-queue-icon",
                bindings: [
                  { from: "owner.model.icon", to: "attributes.src", transform: icon => `assets/${icon}.svg` },
                ],
              },
              {
                tag: "span",
                bindings: [{ from: "owner.model.text", to: "content", transform: x => ' ' + x }],
                classes: "time-queue-desc"
              },
            ]
          }],
        }
      ]
    }
  ]
});

ready(function() {
  let pending_timers = [];
  const app = new EnyoApplication({
    placing: ID_NONE,
    vendoring: false,
    game_over: false,
    hp: 9,

    money: 10,
    timers: new Collection([
      { time: 1, ticks: 10*TPS, text: "enemies", icon: "wave" },
      { time: 1, ticks: 60*TPS, text: "vendor", icon: "vendor" },
      // { time: "1:35", text: "enemies",  icon: "wave",   },
      // { time: "0:40", text: "vendor",   icon: "vendor", },
      // { time: "0:01", text: "axe done", icon: "axe",    }
    ]),
    inv: new Model({
      [ID_ITEM_WOOD     ]: 20,
      [ID_ITEM_SCREW    ]: 32,
      [ID_ITEM_AXE      ]:  2,
      [ID_ITEM_FLARE    ]:  1,
      [ID_ITEM_AIRSTRIKE]:  1,
      [ID_ITEM_PC       ]:  0,
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

  function find_path_to_portal(start_x, start_y, ctx) {
    const WALL_PAD = 0.07;
    const LONE_PAD = 0.05;

    /* make walls that stick out a bit past their posts */
    let posts = [];
    const _walls = walls_stuck_out(WALL_PAD);
    for (const { from, to } of _walls) {
      let { x: from_x, y: from_y } = from;
      let { x:   to_x, y:   to_y } = to  ;
      posts.push({ x: from_x, y: from_y, connects: [] });
      posts.push({ x:   to_x, y:   to_y, connects: [] });
    }

    /* cubic performance LET'S FUCKING GOOOO */
    const extra_posts = [];
    const wall_traps = traps.filter(t => t.kind == ID_TRAP_WALL);
    for (const from of posts) {
      for (const to of posts) {
        for (const p of wall_traps) (() => {
          if (from == to) return;

          for (const { from: l, to: r } of _walls)
            if (line_hits_line(l, r, from, to))
              return;

          if (p != from  && p != to  &&
              point_to_line(from, to, p.x, p.y) < 0.05) {

            let near_x, near_y;
            let  far_x,  far_y;
            if (point_to_point(p.x, p.y, from.x, from.y) <
                point_to_point(p.x, p.y,   to.x,   to.y))
              near_x = from.x,  far_x =   to.x,
              near_y = from.y,  far_y =   to.y;
            else
              near_x =   to.x,  far_x = from.x,
              near_y =   to.y,  far_y = from.y;

            const len = point_to_point(near_x, near_y, far_x, far_y);
            const tan_x = (near_x - far_x) / len;
            const tan_y = (near_y - far_y) / len;

            let norm_x, norm_y;
            if (((near_x - far_x) * (p.y - far_y) - (near_y - far_y) * (p.x - far_x)) < 0)
              norm_x =  tan_y,
              norm_y = -tan_x;
            else
              norm_x = -tan_y,
              norm_y =  tan_x;

            extra_posts.push({
              x: p.x + norm_x*LONE_PAD,
              y: p.y + norm_y*LONE_PAD,
              connects: []
            });
          }
        })();
      }
    }
    posts = posts.concat(extra_posts);

    let start, end;
    posts.push(start = { x: start_x,  y: start_y , connects: [] });
    posts.push(  end = { x: PORTAL_X, y: PORTAL_Y, connects: [] });

    /* (not-quite) quadratic perf goes weee */
    const pairs = [];
    for (const from of posts) {
      for (const to of posts) {
        if (from == to) continue;

        let push = true;
        for (const { from: l, to: r } of pairs) {
          if ((l == from || l == to) &&
              (r == from || r == to)) {
            push = false;
            break;
          }
        }
        for (const { from: l, to: r } of _walls) {
          if (line_hits_line(l, r, from, to)) {
            push = false;
            break;
          }
        }
        for (const p of wall_traps) {
          if (p != from  && p != to  &&
              p != start && p != end &&
              point_to_line(from, to, p.x, p.y) < 0.02) {
            push = false;
            break;
          }
        }

        if (push) {
          from.connects.push(  to);
            to.connects.push(from);
          pairs.push({ from, to });
        }
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

    if (ctx) {
      ctx.globalAlpha = 0.3;
      for (const { from, to } of pairs) {
        const WALL_THICK = 0.0195;
        const WALL_COLOR = "#76609f";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(  to.x,   to.y);
        ctx.lineWidth = WALL_THICK;
        ctx.strokeStyle = WALL_COLOR;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.8;
      for (const { from, to } of ret) {
        const WALL_THICK = 0.0095;
        const WALL_COLOR = "#a6656d";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(  to.x,   to.y);
        ctx.lineWidth = WALL_THICK;
        ctx.strokeStyle = WALL_COLOR;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    return ret.reverse().map(x => x.from);
  }


  let screen_to_world;
  function tick() {
    // if (screen_to_world) {
    //   let mouse = new DOMPoint(mouse_x, mouse_y, 0, 1).matrixTransform(screen_to_world);
    // }
    const cleanups = [];

    /* sorting the collection directly caused error in DataRepeater
       also calling remove without the sort causes error in DataRepeater */

    const tq = app.get("$.sandEnyoBox.$.time_queue");
    for (let i = 0; i < app.timers.length; i++)
      tq.remove(0);

    const models = app.timers.empty({ destroy: false });
    for (const pending_timer of pending_timers) {
      models.push(new Model(pending_timer));
    }
    pending_timers = [];
    models.sort((a, b) => {
      if (b.attributes.ticks == a.attributes.ticks) {
        b.cheese = b.cheese ? b.cheese : Math.random();
        a.cheese = a.cheese ? a.cheese : Math.random();
        return b.cheese - a.cheese;
      }
      return b.attributes.ticks - a.attributes.ticks
    });

    for (const tt of tick_timeouts) {
      tt.ticks--;
      if (tt.ticks == 0) {
        tt.fn();
        cleanups.push(() => tick_timeouts.splice(tick_timeouts.indexOf(tt), 1));
      }
    }

    for (const t of models) {
      t.set('ticks', t.get('ticks')-1);
      if (t.get('ticks') < 0) continue;

      let secs = Math.floor(t.get('ticks') / TPS);
      secs = (''+secs).padStart(2, '0');
      // let sub = 1 - ((t.get('ticks') / TPS) - secs)
      //sub = (''+sub.toFixed(2)).padStart(2, '0').substr(2);
      // t.set('time', secs+':'+sub);
      t.set('time', '0:' + secs);

      if (t.get('ticks') <= 0) {

        /* TODO: enum */
        if (t.get("text") == "enemies") {
          if (window.wave_size == undefined)
            window.wave_size = 4;
          else
            window.wave_size++;

          let enemy_count = 0;
          console.log(`spawning wave of ${window.wave_size} enemies`);
          (function enemy() {
            enemy_count++;
            if (enemy_count <= window.wave_size)
              tick_timeouts.push({ fn: enemy, ticks: Math.floor(0.8*TPS) });

            const { x, y } = trees[Math.floor(Math.random()*trees.length)];
            const path = find_path_to_portal(x, y);
            enemies.push({ x, y, ticks: 0, path });
          })();

          pending_timers.push({ time: 1, ticks: 10*TPS, text: "enemies", icon: "wave" });
        }

        if (t.get("text") == "vendor") {
          app.set("vendoring", true);
          app.set("placing", ID_NONE);
          pending_timers.push({ time: 1, ticks: 60*TPS, text: "vendor", icon: "vendor" });
        }

        if (t.get("text") == "axe done") {
          const inv = app.inv;
          inv.set(ID_ITEM_AXE, inv.get(ID_ITEM_AXE) + 1);
          inv.set(ID_ITEM_WOOD, inv.get(ID_ITEM_WOOD) + Math.floor(lerp(3, 5, Math.random())));

        }
      }
      else {
        app.timers.add(t);
        tq.add(t);
      }
    }

    const kill_p = p => cleanups.push(() => projectiles.splice(projectiles.indexOf(p), 1));
    const kill_e = e => cleanups.push(() => enemies    .splice(enemies    .indexOf(e), 1));
    for (const p of projectiles) {

      p.ticks++;
      let JOURNEY_TICKS = 0.5 * TPS;
      if (p.kind == ID_TRAP_SWINGER) JOURNEY_TICKS = 1.0 * TPS;
      if (p.kind == ID_TRAP_BLASTER) JOURNEY_TICKS = 1.4 * TPS;
      if (p.kind == ID_TRAP_AUTO   ) JOURNEY_TICKS = 1.4 * TPS;

      if (p.ticks > JOURNEY_TICKS) { kill_p(p); continue; }

      /* quadratic perf goes weee */
      for (const e of enemies) {
        const dist = point_to_point(p.x, p.y, e.x, e.y);
        if (dist < 0.04) {
          kill_p(p);
          kill_e(e);
          app.set('money', app.get('money')+1);
          break;
        }
      }
      
      p.x += p.vx * 0.003;
      p.y += p.vy * 0.003;
    }

    for (const e of enemies) {
      e.ticks++;
      const UNITS_PER_TICK = 0.001;

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

      /* HONEY I'M HOOOOOME */
      if (e.path.length == 0) {
        app.set("hp", app.get("hp") - 1);
        if (app.get("hp") == 0)
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

    for (const trap of traps) {
      trap.ticks++;

      const shoot = (angle=0) => {
        projectiles.push({
          kind: trap.kind,
          x: trap.x,
          y: trap.y,
          rot: trap.rot,
          vx: -Math.cos(trap.rot+angle),
          vy: -Math.sin(trap.rot+angle),
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
          return (dist < best.dist) ? { dist, e } : best;
        });

        const ideal_rot = Math.atan2(trap.y - nearest.y, trap.x - nearest.x);
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
    
    let mouse = new DOMPoint(mouse_x, mouse_y, 0, 1).matrixTransform(screen_to_world);
    for (const tree of trees) {
      const { x, y, rot, seed } = tree;
      const size = 0.04;

      for (let i = 0; i < 2; i++) {
        if (app.placing == ID_ITEM_AXE) {
          i = +!i;
        }
        ctx.fillStyle = i ? "#609f6d" : "#54895f" ;

        if (app.placing == ID_ITEM_AXE && !tree.being_chopped) {
          const hover = point_to_point(mouse.x, mouse.y, x, y) < size*2;
          ctx.fillStyle = "#9f6060"

          if (mouse_down && hover) {
            const ticks = 15*TPS;
            pending_timers.push({
              time: 1, ticks,
              text: "axe done", icon: "axe",
            });
            tree.being_chopped = 1;
            tick_timeouts.push({
              fn: () => trees.splice(trees.indexOf(tree), 1),
              ticks
            });

            const key = ID_ITEM_AXE;
            const inv = app.inv;
            inv.set(key, inv.get(key) - 1);

            app.set('placing', ID_NONE);
          }
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot + (0.1*seed + 0.3)*Math.PI*i);
        if (tree.being_chopped) {
          const scale = 1 + 0.2*Math.sin(0.01*now);
          ctx.scale(scale, scale);
        }
        ctx.fillRect(size/-2, size/-2, size, size);
        ctx.restore();
      }
    }

    // const ROAD_COLOR = i ? "#6575a6" : "#57658f";

    for (const { x, y } of enemies) {
      const size = 0.03;
      ctx.fillStyle = "#9f6060";
      ctx.fillRect(x + size/-2, y + size/-2, size, size);
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

          ctx.fillStyle = "#76609f";
          ctx.fillRect(
            x + size*lerp(-0.5, 0.5, j/2) - sub_size/2,
            y + size*lerp(-0.5, 0.5, i/2) - sub_size/2,
            sub_size, sub_size
          );
        }
    }

    for (const { x, y, rot } of projectiles) {
      const size = 0.015;
      ctx.fillStyle = "#9f6060";
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
        for (const from of posts) {
          for (const to of posts) {
            if (from == to) continue;

            let push = true;
            for (const { points: [l, r] } of pairs) {
              if ((l == from || l == to) &&
                  (r == from || r == to)) {
                push = false;
                break;
              }
            }
            for (const { from: l, to: r } of _walls) {
              if (line_hits_line(l, r, from, to)) {
                push = false;
                break;
              }
            }
            for (const t of trees)
              if (point_to_line(from, to, t.x, t.y) < 0.035) {
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
            finish_place();
          }
          return;
        } else {
          for (const t of trees)
            if (point_to_point(t.x, t.y, x, y) < 0.035) {
              ctx.beginPath();
              const size = 0.015;
              ctx.moveTo(x - size, y - size);
              ctx.lineTo(x + size, y + size);
              ctx.moveTo(x + size, y - size);
              ctx.lineTo(x - size, y + size);
              ctx.lineWidth = 0.01;
              ctx.strokeStyle = "#a6656d";
              ctx.stroke();
              return;
            }
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

    if (0) find_path_to_portal(mouse.x, mouse.y, ctx);

    ctx.restore();
  });

  console.log('Hello World!');
});
