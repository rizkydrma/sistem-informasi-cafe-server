const { AbilityBuilder, Ability } = require('@casl/ability');

const policies = {
  guest(user, { can }) {
    can('read', 'Product');
    can('view', 'Order');
    can('create', 'Order');
    can('read', 'Order', { user_id: user._id });
    can('update', 'Order', { _id: user._id });

    can('read', 'Liked', { user_id: user._id });
    can('update', 'Liked', { user_id: user._id });
    can('read', 'Cart', { user_id: user._id });
    can('update', 'Cart', { user_id: user._id });

    can('view', 'Table', { user_id: user._id });
    can('update', 'Table', { user_ud: user._id });

    can('read', 'Invoice', { user_id: user._id });
  },
  user(user, { can }) {
    can('view', 'Order');
    can('create', 'Order');
    can('read', 'Order', { user_id: user._id });
    can('update', 'Order', { _id: user._id });

    can('read', 'Card', { user_id: user._id });
    can('update', 'Cart', { user_id: user._id });

    can('view', 'DeliveryAddress');
    can('create', 'DeliveryAddress', { user_id: user._id });
    can('read', 'DeliveryAddress', { user_id: user._id });
    can('update', 'DeliveryAddress', { user_id: user._id });
    can('delete', 'DeliveryAddress', { user_id: user._id });

    can('read', 'Invoice', { user_id: user._id });
  },
  admin(user, { can }) {
    can('manage', 'all');
  },
};

function policyFor(user) {
  let builder = new AbilityBuilder();

  if (user && typeof policies[user.role] === 'function') {
    policies[user.role](user, builder);
  } else {
    policies['guest'](user, builder);
  }

  return new Ability(builder.rules);
}

module.exports = {
  policyFor,
};
