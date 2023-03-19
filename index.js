// vim: sw=2 ts=2 expandtab smartindent ft=javascript

const ready = require('enyo/ready'),
      kind = require('enyo/kind');

const Button       = require('enyo/Button'),
      Collection   = require('enyo/Collection'),
      Model        = require('enyo/Model'),
      DataRepeater = require('enyo/DataRepeater'),
      Group        = require('enyo/Group'),
      EnyoImage    = require('enyo/Image');

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

/* everything worth saving to disk */
const state = new Model({
  inventory: new Collection([
    { count: 20, id: ID_ITEM_WOOD     },
    { count: 32, id: ID_ITEM_SCREW    },
    { count:  2, id: ID_ITEM_AXE      },
    { count:  1, id: ID_ITEM_FLARE    },
    { count:  1, id: ID_ITEM_AIRSTRIKE},
    { count:  3, id: ID_ITEM_PC       },
    { count:  1, id: ID_ITEM_BOOK     },
    { count:  0, id: ID_NONE          },
  ])
});

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
  classes: 'trap-box',
  events: { onSelect: '' },
  handlers: { ontap: 'on_tap' },
  components: [
    { name: 'img',   classes: "icon-shadow", kind: EnyoImage, src: 'assets/warning.svg' },
  ],
  bindings: [
    { from: 'model.id', to: '$.img.src', transform: id => `assets/${id_to_slug[id]}.svg` },
    { from: 'model.id', to: '$.img.alt', transform: id => id_to_slug[id] },
    { from: 'selected', to: 'classes',   transform: selected => {
      let classes = 'enyo-tool-decorator trap-box';
      if (selected) classes += ' trap-box-selected';
      return classes;
    }}
  ],
  on_tap() { this.doSelect(this.get('model.id')); },
});

const can_afford = recipe => {
  for (const id in recipe) {
    const amount = recipe[id];
    for (const stack of state.get('inventory').models)
      if (stack.get('id') == id && stack.get('count') < amount)
        return false;
  }
  return true;
}
const TrapMenu = kind({
  name: "TrapMenu",
  handlers: { onSelect: 'on_select' },
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
      classes: 'section-info recipe-ingredient-list',
      components: [
        { name: 'ingredient_list', allowHtml: true },
        { kind: Button, name: "craft", content: "CRAFT", style: "visibility:hidden", classes: 'recipe-buy-button' },
      ]
    }
  ],
  on_select(sender, trap_id) {
    for (const trap of this.$.dataRepeater.$.container.children)
      trap.set('selected', trap.get('model.id') == trap_id);
    this.$.trap_name.set('content', id_to_name[trap_id]);

    this.$.info.set('content', id_to_desc[trap_id] + '<br><br>');

    let list = '<b>INGREDIENTS:</b><br>';
    const recipe = trap_to_recipe[trap_id];
    for (const id in recipe) {
      if (recipe[id] == 0) continue;
      list += `<img class="recipe-ingredient-img" src="assets/${id_to_slug[id]}.svg">`;

      let klass = "recipe-ingredient-span";
      if (!can_afford({ [id]: recipe[id] })) klass += ' red';
      list += `<span class="${klass}"> - x${recipe[id]} ${id_to_name[id]} </span>`;
      list += '<br>';
    }
    this.$.ingredient_list.set('content', list);

    this.$.craft.set('style', '');
    this.$.craft.set('disabled', !can_afford(recipe));
  }
});

const App = kind({
  name: "sandenyobox",
  components: [{
    classes: "sidebar",
    components: [
      {
        components: [
          { content: "inventory", classes: "section-header" },
          {
            kind: DataRepeater,
            components: [ { kind: ItemBox } ],
            collection: state.get('inventory')
          }
        ]
      },
      { content: "<br>", allowHtml: true },
      { kind: TrapMenu },
    ],
  }]
});

ready(function() {
  const app = new App();
  // window.onkeydown = () => inventory.at(0).set('item_count', inventory.at(0).get('item_count')+1);

  app.renderInto(document.body);

  console.log('Hello World!');
});
