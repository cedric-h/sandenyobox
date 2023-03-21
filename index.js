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

let _id = 0;
const ID_NONE           = _id++;
const ID_ITEM_WOOD      = _id++;
const ID_ITEM_SCREW     = _id++;
const ID_ITEM_AXE       = _id++;
const ID_ITEM_FLARE     = _id++;
const ID_ITEM_AIRSTRIKE = _id++;
const ID_ITEM_PC        = _id++;
const ID_ITEM_BOOK      = _id++;
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
  [ID_ITEM_FLARE    ]: "immediately summons the next vendor/attack",
  [ID_ITEM_AIRSTRIKE]: "removes trees and enemies where indicated",
  [ID_ITEM_PC       ]: "used to make automatic turret traps",
  [ID_ITEM_BOOK     ]: "makes bulk deals available from vendors",
  [ID_TRAP_PISTON   ]: "this inexpensive trap stabs in a given direction",
  [ID_TRAP_SWINGER  ]: "this trap swings between any two angles",
  [ID_TRAP_BLASTER  ]: "similar to the piston trap, but longer range",
  [ID_TRAP_AUTO     ]: "this automatic turret freely rotates and fires",
};
const trap_to_recipe = {
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
	create() {
		this.inherited(arguments);
    const id = this.get('model.id');
    console.log(id);
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
  selected_trap: ID_TRAP_PISTON,
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
            const recipe = trap_to_recipe[this.get("makes_trap")];
            const inv = this.get('app.inv');
            for (const key in recipe) {
              inv.set(key, inv.get(key) - recipe[key]);
            }
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
  components: [
    {
      classes: "sidebar sidesidebar",
      components: [
        { tag: "span", content: "vendor", classes: "section-header" },
        {
          kind: DataRepeater,
          collection: [ ID_ITEM_SCREW, ID_ITEM_AXE, ID_ITEM_AIRSTRIKE, ID_ITEM_FLARE ],
          components: [
            {
              classes: 'vendor-good-div',
              components: [
                { kind: ItemBox, enable_tooltips: false, count: 1, bindings: [{ from: "owner.model", to: "iid" }] },
                {
                  bindings: [{ from: "owner.model", to: "content", transform: id => id_to_desc[id] }],
                  classes: "section-info",
                  style: "font-size: 0.75em; width: 9em;"
                },
                {
                  kind: Button,
                  components: [
                    { tag: 'span', content: "5", classes: "section-header", style: "margin-right: 0.3em" },
                    {
                      tag: "img",
                      classes: "recipe-ingredient-img",
                      attributes: { src: "assets/money.svg" },
                    },
                 ],
                  classes: 'recipe-buy-button',
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
              style: "height: 2.0em",
              classes: 'recipe-buy-button',
            }
          ]
        },
      ]
    },
    {
      classes: "sidebar",
      bindings: [
        { from: "app.placing", to: "style",
          transform: id => (id == ID_NONE) ? '' : "filter: opacity(30%); pointer-events: none;" }
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
                  { tag: "span", content: "10", classes: "section-header" },
                ]}
              ]
            },
            {
              kind: DataRepeater,
              classes: "item-box-div",
              components: [ { kind: InvItemBox } ],
              collection: [
                ID_ITEM_WOOD     , ID_ITEM_SCREW    , ID_ITEM_AXE      , ID_ITEM_FLARE    ,
                ID_ITEM_AIRSTRIKE, ID_ITEM_PC       , ID_ITEM_BOOK     , ID_NONE          ,
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
      style: "position: absolute; top: 0em; left: 0.5em;",
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
          attributes: { src: "assets/airstrike.svg" },
        },
        {
          tag: "span",
          content: " placing airstrike",
          style: "font-family: monospace; font-size: 1.5em; position: relative; bottom: 0.2em;"
        },
      ]
    },
    {
      classes: "time-queue-container",
      components: [
        {
          kind: DataRepeater,
          components: [ { style: "margin-top: 0.6em", components: [
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
          ] } ],
          collection: [
            { time: "1:35", text: "enemies",  icon: "wave",   },
            { time: "0:40", text: "vendor",   icon: "vendor", },
            { time: "0:01", text: "axe done", icon: "axe",    }
          ],
        }
      ]
    }
  ]
});

ready(function() {
  const app = new EnyoApplication({
    placing: ID_NONE,
    inv: new Model({
      [ID_ITEM_WOOD     ]: 20,
      [ID_ITEM_SCREW    ]: 32,
      [ID_ITEM_AXE      ]:  2,
      [ID_ITEM_FLARE    ]:  1,
      [ID_ITEM_AIRSTRIKE]:  1,
      [ID_ITEM_PC       ]:  3,
      [ID_ITEM_BOOK     ]:  1,
      [ID_NONE          ]:  0,
    }),
    view: App
  });

  console.log('inv check', app.get('inv.' + ID_ITEM_WOOD));
  // console.log();
  // app.get('$.inventory.models.0').observe('count', (was, is, prop) => console.log({ was, is, prop }));
  window.onkeydown = () =>  {
    app.set('placing', (app.get('placing') == ID_NONE) ? ID_ITEM_AIRSTRIKE : ID_NONE);

    const wood = "inv." + ID_ITEM_WOOD;
    app.set(wood, 1+app.get(wood));
  }

  app.renderInto(document.body);

  console.log('Hello World!');
});
