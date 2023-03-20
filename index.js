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
    const amount = recipe[id];
    for (let i = 0; i < inv.length; i++) {
      const stack = inv.at(i);
      if (stack.get('id') == id && stack.get('count') < amount)
        return false;
    }
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
  kind: Button,
  classes: 'item-box',
  components: [
    { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
    { name: 'count', classes: "item-box-count", content: '' }
  ],
  bindings: [
    { from: 'model.id',    to: '$.img.src', transform: id => `assets/${id_to_slug[id]}.svg` },
    { from: 'model.id',    to: '$.img.alt', transform: id => id_to_slug[id] },
    { from: 'model.count', to: '$.count.content' },
    { from: 'model.id',    to: '$.img.style'  , transform: id => 'visibility: ' + ((id == ID_NONE) ? 'hidden' : 'visible') },
    { from: 'model.id',    to: '$.count.style', transform: id => 'visibility: ' + ((id == ID_NONE) ? 'hidden' : 'visible') },
  ],
});

const TrapBox = kind({
  kind: Button,
  components: [
    { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
  ],
  bindings: [
    { from: 'model.id', to: '$.img.src', transform: id => `assets/${id_to_slug[id]}.svg` },
    { from: 'model.id', to: '$.img.alt', transform: id => id_to_slug[id] },
    { from: 'owner.selected_trap', to: 'selected', transform(selected) { return selected == this.get('model.id') } },
    { from: 'classes_str', to: 'classes' },
  ],
  computed: [ { method: 'classes_str', path: ['selected'] } ],
  classes_str() {
    const selected = this.get('selected');
    const trap_id = this.get('model.id');

    let classes = 'enyo-tool-decorator trap-box';

    if (selected)
      classes += ' trap-box-selected';
    else if (can_afford(this.get('app.$.inventory'), trap_to_recipe[trap_id]))
      classes += ' trap-box-affordable';

    return classes;
  }
});
/*
const TrapBox = kind({
  kind: Button,
  classes: 'trap-box',
  components: [
    { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
  ],
  bindings: [
    { from: 'model.id', to: '$.img.src', transform: id => `assets/${id_to_slug[id]}.svg` },
    { from: 'model.id', to: '$.img.alt', transform: id => id_to_slug[id] },
    { from: 'classes_str', to: 'classes' },
  ],
  computed: [
    { method: 'classes_str', path: [ 'owner.selected_trap' ] }// , 'affordable' ] }
    // { method: 'affordable',  path: [ 'affordable' ] }
  ],
  classes_str() {
    const selected = this.get('owner.selected_trap');
    const trap_id = this.get('model.id');

    let classes = 'enyo-tool-decorator trap-box';

    if (selected == trap_id)
      classes += ' trap-box-selected';
    else if (can_afford(trap_to_recipe[trap_id]))
      classes += ' trap-box-affordable';

    return classes;
  },
});*/

const TrapMenu = kind({
  name: "TrapMenu",
  handlers: { ontap: 'on_tap' },
  selected_trap: ID_TRAP_PISTON,
  components: [
    { content: "traps", classes: "section-header" },
    {
      kind: DataRepeater,
      components: [ { kind: TrapBox } ],
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
                  /* "has_enough -> classes" is a workaround for bug where 'class' attribute is set to a stringified function */
                  computed: [
                    { method: "content", path: ["owner.model.ingredient", "owner.model.amount", "app.$.inventory" ] },
                    { method: "has_enough", path: ["owner.model.ingredient", "owner.model.amount", "app.$.inventory" ] },
                  ],
                  bindings: [
                    { from: "has_enough", to: "classes",
                      transform: has_enough => "recipe-ingredient-span" + (has_enough ? '' : ' recipe-ingredient-span-missing')
                    },
                  ],
                  has_enough() {
                    const id  = this.get("owner.model.ingredient");
                    const amt = this.get("owner.model.amount");
                    return can_afford(this.get('app.$.inventory'), { [id]: amt });
                  },
                  content() {
                    const id  = this.get("owner.model.ingredient");
                    const amt = this.get("owner.model.amount");
                    return `- x${amt} ${id_to_name[id]}`;
                  }
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
          handlers: { ontap: 'on_tap' },
          on_tap() {
            const recipe = trap_to_recipe[this.get("owner.selected_trap")];
            const inv = this.get('app.$.inventory');
            for (const key in recipe) {
              const itm = inv.find(x => x.get('id') == key);
              itm.set('count', itm.get('count') - recipe[key]);
            }

            // console.log({ inv });
            // this.set('app.$.inventory', new Collection(inv.toJSON()));
            inv.commit();
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
    if (ev.model && ev.model.get)
      this.set('selected_trap', ev.model.get('id'));
  },
});

const App = kind({
  name: "SandEnyoBox",
  components: [{
    classes: "sidebar",
    components: [
      {
        components: [
          { content: "inventory", classes: "section-header" },
          {
            kind: DataRepeater,
            components: [ { kind: ItemBox } ],
            bindings: [ { from: 'app.$.inventory', to: 'collection' } ],
          }
        ]
      },
      { content: "<br>", allowHtml: true },
      { kind: TrapMenu, name: 'trap_menu' },
    ],
  }]
});

ready(function() {
  const app = new EnyoApplication({
    components: [
      {
        name: 'inventory',
        kind: Collection,
        public: true,
        models: [
          { count: 20, id: ID_ITEM_WOOD     },
          { count: 32, id: ID_ITEM_SCREW    },
          { count:  2, id: ID_ITEM_AXE      },
          { count:  1, id: ID_ITEM_FLARE    },
          { count:  1, id: ID_ITEM_AIRSTRIKE},
          { count:  3, id: ID_ITEM_PC       },
          { count:  1, id: ID_ITEM_BOOK     },
          { count:  0, id: ID_NONE          },
        ],
      }
    ],
    view: App
  });

  /* everything worth saving to disk */
  console.log(app.get('$.inventory.models.0.count'));
  // console.log();
  app.get('$.inventory').modelsChanged(console.log);
  window.onkeydown = () =>  {
    const model = app.get('$.inventory').at(0);
    const now = model.get('count');
    console.log(now);
    debugger;
    model.set('count', 1+now);
  }

  app.renderInto(document.body);

  console.log('Hello World!');
});
