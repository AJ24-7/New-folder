import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi')
  ];

  /// Application title
  ///
  /// In en, this message translates to:
  /// **'Gym-wale'**
  String get appTitle;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @explore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get explore;

  /// No description provided for @bookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get bookings;

  /// No description provided for @favorites.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get favorites;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @searchGyms.
  ///
  /// In en, this message translates to:
  /// **'Search gyms...'**
  String get searchGyms;

  /// No description provided for @nearMe.
  ///
  /// In en, this message translates to:
  /// **'Near Me'**
  String get nearMe;

  /// No description provided for @filters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filters;

  /// No description provided for @clearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear Filters'**
  String get clearFilters;

  /// No description provided for @applyFilters.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get applyFilters;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System Default'**
  String get themeSystem;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageHindi.
  ///
  /// In en, this message translates to:
  /// **'हिंदी (Hindi)'**
  String get languageHindi;

  /// No description provided for @generalSettings.
  ///
  /// In en, this message translates to:
  /// **'General Settings'**
  String get generalSettings;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacy;

  /// No description provided for @displaySettings.
  ///
  /// In en, this message translates to:
  /// **'Display'**
  String get displaySettings;

  /// No description provided for @measurements.
  ///
  /// In en, this message translates to:
  /// **'Measurements'**
  String get measurements;

  /// No description provided for @notificationsEnabled.
  ///
  /// In en, this message translates to:
  /// **'Enable Notifications'**
  String get notificationsEnabled;

  /// No description provided for @soundEnabled.
  ///
  /// In en, this message translates to:
  /// **'Sound'**
  String get soundEnabled;

  /// No description provided for @vibrationEnabled.
  ///
  /// In en, this message translates to:
  /// **'Vibration'**
  String get vibrationEnabled;

  /// No description provided for @autoPlayVideos.
  ///
  /// In en, this message translates to:
  /// **'Auto-play Videos'**
  String get autoPlayVideos;

  /// No description provided for @dataSaverMode.
  ///
  /// In en, this message translates to:
  /// **'Data Saver Mode'**
  String get dataSaverMode;

  /// No description provided for @shareWorkoutData.
  ///
  /// In en, this message translates to:
  /// **'Share Workout Data'**
  String get shareWorkoutData;

  /// No description provided for @shareProgress.
  ///
  /// In en, this message translates to:
  /// **'Share Progress'**
  String get shareProgress;

  /// No description provided for @profileVisibility.
  ///
  /// In en, this message translates to:
  /// **'Profile Visibility'**
  String get profileVisibility;

  /// No description provided for @profilePublic.
  ///
  /// In en, this message translates to:
  /// **'Public'**
  String get profilePublic;

  /// No description provided for @profileFriends.
  ///
  /// In en, this message translates to:
  /// **'Friends Only'**
  String get profileFriends;

  /// No description provided for @profilePrivate.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get profilePrivate;

  /// No description provided for @fontSize.
  ///
  /// In en, this message translates to:
  /// **'Font Size'**
  String get fontSize;

  /// No description provided for @workoutAssistant.
  ///
  /// In en, this message translates to:
  /// **'Workout Assistant'**
  String get workoutAssistant;

  /// No description provided for @workout_assistant.
  ///
  /// In en, this message translates to:
  /// **'Workout Assistant'**
  String get workout_assistant;

  /// No description provided for @workout_plans.
  ///
  /// In en, this message translates to:
  /// **'Workout Plans'**
  String get workout_plans;

  /// No description provided for @personalized_workouts.
  ///
  /// In en, this message translates to:
  /// **'Personalized Workouts'**
  String get personalized_workouts;

  /// No description provided for @calculate_bmi.
  ///
  /// In en, this message translates to:
  /// **'Calculate BMI'**
  String get calculate_bmi;

  /// No description provided for @your_bmi.
  ///
  /// In en, this message translates to:
  /// **'Your BMI'**
  String get your_bmi;

  /// No description provided for @bmi_category.
  ///
  /// In en, this message translates to:
  /// **'BMI Category'**
  String get bmi_category;

  /// No description provided for @underweight.
  ///
  /// In en, this message translates to:
  /// **'Underweight'**
  String get underweight;

  /// No description provided for @normal_weight.
  ///
  /// In en, this message translates to:
  /// **'Normal Weight'**
  String get normal_weight;

  /// No description provided for @overweight.
  ///
  /// In en, this message translates to:
  /// **'Overweight'**
  String get overweight;

  /// No description provided for @obese.
  ///
  /// In en, this message translates to:
  /// **'Obese'**
  String get obese;

  /// No description provided for @fitness_level.
  ///
  /// In en, this message translates to:
  /// **'Fitness Level'**
  String get fitness_level;

  /// No description provided for @beginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get beginner;

  /// No description provided for @intermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get intermediate;

  /// No description provided for @advanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get advanced;

  /// No description provided for @recommended_plans.
  ///
  /// In en, this message translates to:
  /// **'Recommended Plans'**
  String get recommended_plans;

  /// No description provided for @all_plans.
  ///
  /// In en, this message translates to:
  /// **'All Plans'**
  String get all_plans;

  /// No description provided for @my_progress.
  ///
  /// In en, this message translates to:
  /// **'My Progress'**
  String get my_progress;

  /// No description provided for @workout_schedule.
  ///
  /// In en, this message translates to:
  /// **'Workout Schedule'**
  String get workout_schedule;

  /// No description provided for @exercises.
  ///
  /// In en, this message translates to:
  /// **'Exercises'**
  String get exercises;

  /// No description provided for @exercise_details.
  ///
  /// In en, this message translates to:
  /// **'Exercise Details'**
  String get exercise_details;

  /// No description provided for @instructions.
  ///
  /// In en, this message translates to:
  /// **'Instructions'**
  String get instructions;

  /// No description provided for @pro_tips.
  ///
  /// In en, this message translates to:
  /// **'Pro Tips'**
  String get pro_tips;

  /// No description provided for @sets.
  ///
  /// In en, this message translates to:
  /// **'Sets'**
  String get sets;

  /// No description provided for @reps.
  ///
  /// In en, this message translates to:
  /// **'Reps'**
  String get reps;

  /// No description provided for @duration.
  ///
  /// In en, this message translates to:
  /// **'Duration'**
  String get duration;

  /// No description provided for @rest_time.
  ///
  /// In en, this message translates to:
  /// **'Rest Time'**
  String get rest_time;

  /// No description provided for @equipment.
  ///
  /// In en, this message translates to:
  /// **'Equipment'**
  String get equipment;

  /// No description provided for @muscle_group.
  ///
  /// In en, this message translates to:
  /// **'Muscle Group'**
  String get muscle_group;

  /// No description provided for @difficulty.
  ///
  /// In en, this message translates to:
  /// **'Difficulty'**
  String get difficulty;

  /// No description provided for @start_plan.
  ///
  /// In en, this message translates to:
  /// **'Start This Plan'**
  String get start_plan;

  /// No description provided for @mark_complete.
  ///
  /// In en, this message translates to:
  /// **'Mark as Complete'**
  String get mark_complete;

  /// No description provided for @exercise_completed.
  ///
  /// In en, this message translates to:
  /// **'Exercise Completed'**
  String get exercise_completed;

  /// No description provided for @weight_kg.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get weight_kg;

  /// No description provided for @height_cm.
  ///
  /// In en, this message translates to:
  /// **'Height (cm)'**
  String get height_cm;

  /// No description provided for @weekly_schedule.
  ///
  /// In en, this message translates to:
  /// **'Weekly Schedule'**
  String get weekly_schedule;

  /// No description provided for @no_active_plan.
  ///
  /// In en, this message translates to:
  /// **'No Active Workout Plan'**
  String get no_active_plan;

  /// No description provided for @explore_workouts.
  ///
  /// In en, this message translates to:
  /// **'Explore Workout Plans'**
  String get explore_workouts;

  /// No description provided for @showAnimations.
  ///
  /// In en, this message translates to:
  /// **'Show Animations'**
  String get showAnimations;

  /// No description provided for @measurementSystem.
  ///
  /// In en, this message translates to:
  /// **'Measurement System'**
  String get measurementSystem;

  /// No description provided for @metric.
  ///
  /// In en, this message translates to:
  /// **'Metric (kg, km)'**
  String get metric;

  /// No description provided for @imperial.
  ///
  /// In en, this message translates to:
  /// **'Imperial (lbs, miles)'**
  String get imperial;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @settingsSaved.
  ///
  /// In en, this message translates to:
  /// **'Settings saved successfully'**
  String get settingsSaved;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @findYourPerfectGym.
  ///
  /// In en, this message translates to:
  /// **'Find Your Perfect Gym'**
  String get findYourPerfectGym;

  /// No description provided for @popularGyms.
  ///
  /// In en, this message translates to:
  /// **'Popular Gyms'**
  String get popularGyms;

  /// No description provided for @topRatedGyms.
  ///
  /// In en, this message translates to:
  /// **'Top rated gyms in your area'**
  String get topRatedGyms;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See All'**
  String get seeAll;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get quickActions;

  /// No description provided for @findGyms.
  ///
  /// In en, this message translates to:
  /// **'Find Gyms'**
  String get findGyms;

  /// No description provided for @bookTrial.
  ///
  /// In en, this message translates to:
  /// **'Book Trial'**
  String get bookTrial;

  /// No description provided for @dietPlans.
  ///
  /// In en, this message translates to:
  /// **'Diet Plans'**
  String get dietPlans;

  /// No description provided for @findTrainer.
  ///
  /// In en, this message translates to:
  /// **'Find Trainer'**
  String get findTrainer;

  /// No description provided for @trainerSpotlight.
  ///
  /// In en, this message translates to:
  /// **'Trainer Spotlight'**
  String get trainerSpotlight;

  /// No description provided for @topTrainers.
  ///
  /// In en, this message translates to:
  /// **'Top trainers for you'**
  String get topTrainers;

  /// No description provided for @specialOffers.
  ///
  /// In en, this message translates to:
  /// **'Special Offers'**
  String get specialOffers;

  /// No description provided for @exclusiveDeals.
  ///
  /// In en, this message translates to:
  /// **'Exclusive deals and discounts'**
  String get exclusiveDeals;

  /// No description provided for @noGymsFound.
  ///
  /// In en, this message translates to:
  /// **'No gyms found'**
  String get noGymsFound;

  /// No description provided for @tryAdjustingSearch.
  ///
  /// In en, this message translates to:
  /// **'Try adjusting your search'**
  String get tryAdjustingSearch;

  /// No description provided for @highestRated.
  ///
  /// In en, this message translates to:
  /// **'Highest Rated'**
  String get highestRated;

  /// No description provided for @nearest.
  ///
  /// In en, this message translates to:
  /// **'Nearest'**
  String get nearest;

  /// No description provided for @nameAZ.
  ///
  /// In en, this message translates to:
  /// **'Name (A-Z)'**
  String get nameAZ;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @rating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get rating;

  /// No description provided for @distance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get distance;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @chooseTheme.
  ///
  /// In en, this message translates to:
  /// **'Choose Theme'**
  String get chooseTheme;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose Language'**
  String get chooseLanguage;

  /// No description provided for @themeUpdatedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Theme updated successfully'**
  String get themeUpdatedSuccessfully;

  /// No description provided for @languageUpdatedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Language updated successfully'**
  String get languageUpdatedSuccessfully;

  /// No description provided for @measurementSystemUpdated.
  ///
  /// In en, this message translates to:
  /// **'Measurement system updated successfully'**
  String get measurementSystemUpdated;

  /// No description provided for @light.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get light;

  /// No description provided for @dark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get dark;

  /// No description provided for @systemDefault.
  ///
  /// In en, this message translates to:
  /// **'System Default'**
  String get systemDefault;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @hindi.
  ///
  /// In en, this message translates to:
  /// **'हिंदी (Hindi)'**
  String get hindi;

  /// No description provided for @chooseMeasurementSystem.
  ///
  /// In en, this message translates to:
  /// **'Choose Measurement System'**
  String get chooseMeasurementSystem;

  /// No description provided for @kgKm.
  ///
  /// In en, this message translates to:
  /// **'kg, km'**
  String get kgKm;

  /// No description provided for @lbsMiles.
  ///
  /// In en, this message translates to:
  /// **'lbs, miles'**
  String get lbsMiles;

  /// No description provided for @myBookings.
  ///
  /// In en, this message translates to:
  /// **'My Bookings'**
  String get myBookings;

  /// No description provided for @myFavorites.
  ///
  /// In en, this message translates to:
  /// **'My Favorites'**
  String get myFavorites;

  /// No description provided for @active.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get active;

  /// No description provided for @expired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get expired;

  /// No description provided for @cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get cancelled;

  /// No description provided for @trials.
  ///
  /// In en, this message translates to:
  /// **'Trials'**
  String get trials;

  /// No description provided for @noBookingsFound.
  ///
  /// In en, this message translates to:
  /// **'No bookings found'**
  String get noBookingsFound;

  /// No description provided for @startFitnessJourney.
  ///
  /// In en, this message translates to:
  /// **'Start your fitness journey now'**
  String get startFitnessJourney;

  /// No description provided for @noFavoritesYet.
  ///
  /// In en, this message translates to:
  /// **'No favorites yet'**
  String get noFavoritesYet;

  /// No description provided for @saveFavoriteGyms.
  ///
  /// In en, this message translates to:
  /// **'Save your favorite gyms here'**
  String get saveFavoriteGyms;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications'**
  String get noNotifications;

  /// No description provided for @youAreAllCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up!'**
  String get youAreAllCaughtUp;

  /// No description provided for @unread.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get unread;

  /// No description provided for @offer.
  ///
  /// In en, this message translates to:
  /// **'Offer'**
  String get offer;

  /// No description provided for @membership.
  ///
  /// In en, this message translates to:
  /// **'Membership'**
  String get membership;

  /// No description provided for @trial.
  ///
  /// In en, this message translates to:
  /// **'Trial'**
  String get trial;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @yesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get yesterday;

  /// No description provided for @thisWeek.
  ///
  /// In en, this message translates to:
  /// **'This Week'**
  String get thisWeek;

  /// No description provided for @earlier.
  ///
  /// In en, this message translates to:
  /// **'Earlier'**
  String get earlier;

  /// No description provided for @subscriptions.
  ///
  /// In en, this message translates to:
  /// **'Subscriptions'**
  String get subscriptions;

  /// No description provided for @gymMemberships.
  ///
  /// In en, this message translates to:
  /// **'Gym Memberships'**
  String get gymMemberships;

  /// No description provided for @upcomingTrials.
  ///
  /// In en, this message translates to:
  /// **'Upcoming Trials'**
  String get upcomingTrials;

  /// No description provided for @trainers.
  ///
  /// In en, this message translates to:
  /// **'Trainers'**
  String get trainers;

  /// No description provided for @workoutPlans.
  ///
  /// In en, this message translates to:
  /// **'Workout Plans'**
  String get workoutPlans;

  /// No description provided for @noActiveMemberships.
  ///
  /// In en, this message translates to:
  /// **'No Active Memberships'**
  String get noActiveMemberships;

  /// No description provided for @startFitnessJourneyToday.
  ///
  /// In en, this message translates to:
  /// **'Start your fitness journey today!'**
  String get startFitnessJourneyToday;

  /// No description provided for @noDietPlans.
  ///
  /// In en, this message translates to:
  /// **'No Diet Plans'**
  String get noDietPlans;

  /// No description provided for @subscribeDietPlan.
  ///
  /// In en, this message translates to:
  /// **'Subscribe to a diet plan for better nutrition!'**
  String get subscribeDietPlan;

  /// No description provided for @noUpcomingTrials.
  ///
  /// In en, this message translates to:
  /// **'No Upcoming Trials'**
  String get noUpcomingTrials;

  /// No description provided for @bookTrialFromGym.
  ///
  /// In en, this message translates to:
  /// **'Book a trial session from gym details'**
  String get bookTrialFromGym;

  /// No description provided for @noTrainersBooked.
  ///
  /// In en, this message translates to:
  /// **'No Trainers Booked'**
  String get noTrainersBooked;

  /// No description provided for @getPersonalizedTraining.
  ///
  /// In en, this message translates to:
  /// **'Get personalized training with expert trainers!'**
  String get getPersonalizedTraining;

  /// No description provided for @showDetails.
  ///
  /// In en, this message translates to:
  /// **'Show Details'**
  String get showDetails;

  /// No description provided for @freeze.
  ///
  /// In en, this message translates to:
  /// **'Freeze'**
  String get freeze;

  /// No description provided for @freezeUsed.
  ///
  /// In en, this message translates to:
  /// **'Freeze Used'**
  String get freezeUsed;

  /// No description provided for @startDate.
  ///
  /// In en, this message translates to:
  /// **'Start Date'**
  String get startDate;

  /// No description provided for @endDate.
  ///
  /// In en, this message translates to:
  /// **'End Date'**
  String get endDate;

  /// No description provided for @membershipFrozenUntil.
  ///
  /// In en, this message translates to:
  /// **'Membership frozen until'**
  String get membershipFrozenUntil;

  /// No description provided for @expiringMessage.
  ///
  /// In en, this message translates to:
  /// **'Your membership is expiring soon. Contact gym to renew!'**
  String get expiringMessage;

  /// No description provided for @freezeMembership.
  ///
  /// In en, this message translates to:
  /// **'Freeze Membership'**
  String get freezeMembership;

  /// No description provided for @freezeYourMembership.
  ///
  /// In en, this message translates to:
  /// **'Freeze your membership temporarily. Your membership will be extended by the freeze duration.'**
  String get freezeYourMembership;

  /// No description provided for @freezeCriteria.
  ///
  /// In en, this message translates to:
  /// **'Freeze Criteria:'**
  String get freezeCriteria;

  /// No description provided for @freezeDuration715.
  ///
  /// In en, this message translates to:
  /// **'• Duration: 7-15 days only'**
  String get freezeDuration715;

  /// No description provided for @freezeOncePerMembership.
  ///
  /// In en, this message translates to:
  /// **'• Can freeze only once per membership'**
  String get freezeOncePerMembership;

  /// No description provided for @validityExtendsAuto.
  ///
  /// In en, this message translates to:
  /// **'• Validity extends automatically'**
  String get validityExtendsAuto;

  /// No description provided for @freezeDuration.
  ///
  /// In en, this message translates to:
  /// **'Freeze Duration'**
  String get freezeDuration;

  /// No description provided for @days.
  ///
  /// In en, this message translates to:
  /// **'days'**
  String get days;

  /// No description provided for @membershipExtendedBy.
  ///
  /// In en, this message translates to:
  /// **'Your membership will be extended by'**
  String get membershipExtendedBy;

  /// No description provided for @reasonOptional.
  ///
  /// In en, this message translates to:
  /// **'Reason (optional)'**
  String get reasonOptional;

  /// No description provided for @reasonPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'e.g., Vacation, Medical, etc.'**
  String get reasonPlaceholder;

  /// No description provided for @membershipFrozenSuccess.
  ///
  /// In en, this message translates to:
  /// **'Membership frozen successfully!'**
  String get membershipFrozenSuccess;

  /// No description provided for @failedToFreeze.
  ///
  /// In en, this message translates to:
  /// **'Failed to freeze membership'**
  String get failedToFreeze;

  /// No description provided for @reminderSet.
  ///
  /// In en, this message translates to:
  /// **'Reminder set for'**
  String get reminderSet;

  /// No description provided for @trialOn.
  ///
  /// In en, this message translates to:
  /// **'trial on'**
  String get trialOn;

  /// No description provided for @viewDietPlan.
  ///
  /// In en, this message translates to:
  /// **'View Diet Plan'**
  String get viewDietPlan;

  /// No description provided for @renewPlan.
  ///
  /// In en, this message translates to:
  /// **'Renew Plan'**
  String get renewPlan;

  /// No description provided for @confirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get confirmed;

  /// No description provided for @pending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pending;

  /// No description provided for @setReminder.
  ///
  /// In en, this message translates to:
  /// **'Set Reminder'**
  String get setReminder;

  /// No description provided for @getDirections.
  ///
  /// In en, this message translates to:
  /// **'Get Directions'**
  String get getDirections;

  /// No description provided for @pendingConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Awaiting gym confirmation. You\'ll be notified once confirmed.'**
  String get pendingConfirmation;

  /// No description provided for @message.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get message;

  /// No description provided for @viewProfile.
  ///
  /// In en, this message translates to:
  /// **'View Profile'**
  String get viewProfile;

  /// No description provided for @sessionType.
  ///
  /// In en, this message translates to:
  /// **'Session Type'**
  String get sessionType;

  /// No description provided for @sessionsBooked.
  ///
  /// In en, this message translates to:
  /// **'Sessions Booked'**
  String get sessionsBooked;

  /// No description provided for @experience.
  ///
  /// In en, this message translates to:
  /// **'Experience'**
  String get experience;

  /// No description provided for @calories.
  ///
  /// In en, this message translates to:
  /// **'cal'**
  String get calories;

  /// No description provided for @protein.
  ///
  /// In en, this message translates to:
  /// **'P'**
  String get protein;

  /// No description provided for @carbs.
  ///
  /// In en, this message translates to:
  /// **'C'**
  String get carbs;

  /// No description provided for @fats.
  ///
  /// In en, this message translates to:
  /// **'F'**
  String get fats;

  /// No description provided for @membershipPass.
  ///
  /// In en, this message translates to:
  /// **'Membership Pass'**
  String get membershipPass;

  /// No description provided for @memberID.
  ///
  /// In en, this message translates to:
  /// **'Member ID'**
  String get memberID;

  /// No description provided for @validUntil.
  ///
  /// In en, this message translates to:
  /// **'Valid Until'**
  String get validUntil;

  /// No description provided for @planName.
  ///
  /// In en, this message translates to:
  /// **'Plan Name'**
  String get planName;

  /// No description provided for @amount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get amount;

  /// No description provided for @scanQRCode.
  ///
  /// In en, this message translates to:
  /// **'Scan QR Code'**
  String get scanQRCode;

  /// No description provided for @scanThisCode.
  ///
  /// In en, this message translates to:
  /// **'Scan this code at gym entrance for attendance'**
  String get scanThisCode;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
