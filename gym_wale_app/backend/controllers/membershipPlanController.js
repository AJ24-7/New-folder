const Gym = require('../models/gym');

// Get all membership plans for the logged-in gym admin
toPlanResponse = (plan) => ({
  name: plan.name,
  price: plan.price,
  discount: plan.discount,
  discountMonths: plan.discountMonths,
  benefits: plan.benefits,
  note: plan.note,
  icon: plan.icon,
  color: plan.color
});

exports.getMembershipPlans = async (req, res) => {
  try {
    const gym = await Gym.findOne({ admin: req.admin.id });
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    
    let plan = gym.membershipPlan;
    if (!plan || (!plan.monthlyOptions?.length && !plan.tiers?.length)) {
      // Fallback: create default plan if not present
      plan = {
        name: 'Standard',
        icon: 'fa-star',
        color: '#3a86ff',
        benefits: ['Gym Access', 'Group Classes', 'Locker Facility'],
        note: 'Flexible membership options',
        planMode: 'single',
        monthlyOptions: [
          { months: 1, price: 1500, discount: 0, isPopular: false },
          { months: 3, price: 4000, discount: 5, isPopular: false },
          { months: 6, price: 7500, discount: 10, isPopular: true },
          { months: 12, price: 14000, discount: 15, isPopular: false }
        ],
        tiers: []
      };
      gym.membershipPlan = plan;
      await gym.save();
    }
    res.json(plan);
  } catch (err) {
    console.error('[API] Error in getMembershipPlans:', err);
    res.status(500).json({ message: 'Error fetching membership plan', error: err.message });
  }
};

// Update membership plan for the logged-in gym admin
exports.updateMembershipPlans = async (req, res) => {
  try {
    const gym = await Gym.findOne({ admin: req.admin.id });
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    
    const plan = req.body;
    const planMode = ['single', 'multi'].includes(plan.planMode) ? plan.planMode : 'single';

    if (planMode === 'multi') {
      // Multi-tier: validate tiers array
      if (!Array.isArray(plan.tiers) || plan.tiers.length === 0) {
        return res.status(400).json({ message: 'Multi-tier plan requires at least one tier' });
      }
      gym.membershipPlan = {
        name: plan.name || 'Multi-Tier Plan',
        icon: plan.icon || 'fa-star',
        color: plan.color || '#3a86ff',
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
        note: plan.note || '',
        planMode: 'multi',
        monthlyOptions: [], // not used in multi mode
        tiers: plan.tiers.map(tier => ({
          name: tier.name || 'Plan',
          icon: tier.icon || 'fa-star',
          color: tier.color || '#3a86ff',
          benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
          note: tier.note || '',
          monthlyOptions: (Array.isArray(tier.monthlyOptions) ? tier.monthlyOptions : []).map(opt => ({
            months: opt.months,
            price: opt.price,
            discount: opt.discount || 0,
            isPopular: opt.isPopular || false
          }))
        }))
      };
    } else {
      // Single-tier mode
      if (!plan || !plan.monthlyOptions || !Array.isArray(plan.monthlyOptions)) {
        return res.status(400).json({ message: 'Invalid membership plan data' });
      }
      gym.membershipPlan = {
        name: plan.name || 'Standard',
        icon: plan.icon || 'fa-star',
        color: plan.color || '#3a86ff',
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
        note: plan.note || '',
        planMode: 'single',
        monthlyOptions: plan.monthlyOptions.map(opt => ({
          months: opt.months,
          price: opt.price,
          discount: opt.discount || 0,
          isPopular: opt.isPopular || false
        })),
        tiers: []
      };
    }
    
    await gym.save();
    
    // Log activity for recent activity section
    const Activity = require('../models/Activity');
    const tierCount = planMode === 'multi' ? gym.membershipPlan.tiers.length : 1;
    await Activity.create({
      gym: gym._id,
      type: 'membership_plan_updated',
      description: `Updated membership plan: ${gym.membershipPlan.name} (${planMode} mode, ${tierCount} tier${tierCount > 1 ? 's' : ''})`,
      metadata: {
        planName: gym.membershipPlan.name,
        planMode,
        optionsCount: planMode === 'multi' ? tierCount : gym.membershipPlan.monthlyOptions.length,
        benefitsCount: gym.membershipPlan.benefits.length
      }
    });
    
    res.json(gym.membershipPlan);
  } catch (err) {
    console.error('[API] Error updating membership plan:', err);
    res.status(500).json({ message: 'Error updating membership plan', error: err.message });
  }
};

// Get membership plans for a specific gym (public endpoint for QR registration)
exports.getGymMembershipPlansPublic = async (req, res) => {
  try {
    const { gymId } = req.params;
    
    const gym = await Gym.findById(gymId).select('membershipPlan');
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    
    let plan = gym.membershipPlan;
    if (!plan || (!plan.monthlyOptions?.length && !plan.tiers?.length)) {
      // Return default plan if none exists
      plan = {
        name: 'Standard',
        icon: 'fa-star',
        color: '#3a86ff',
        benefits: ['Gym Access', 'Group Classes', 'Locker Facility'],
        note: 'Flexible membership options',
        planMode: 'single',
        monthlyOptions: [
          { months: 1, price: 1500, discount: 0, isPopular: false },
          { months: 3, price: 4000, discount: 5, isPopular: false },
          { months: 6, price: 7500, discount: 10, isPopular: true }
        ],
        tiers: []
      };
    }
    
    res.json(plan);
  } catch (err) {
    console.error('[API] Error fetching public membership plans:', err);
    res.status(500).json({ message: 'Error fetching membership plans', error: err.message });
  }
};
