const toRatioNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const getPokemonGenderOptions = (pokemon = {}) => {
  const ratio = pokemon?.genderRatio;
  const male = toRatioNumber(ratio?.male);
  const female = toRatioNumber(ratio?.female);

  if (!ratio) {
    return ['male', 'female'];
  }

  if (male <= 0 && female <= 0) {
    return ['none'];
  }

  const options = [];
  if (male > 0) options.push('male');
  if (female > 0) options.push('female');

  return options.length > 0 ? options : ['none'];
};

export const generatePokemonGender = (pokemon = {}) => {
  const ratio = pokemon?.genderRatio;
  const male = toRatioNumber(ratio?.male);
  const female = toRatioNumber(ratio?.female);

  if (!ratio) {
    return Math.random() < 0.5 ? 'male' : 'female';
  }

  if (male <= 0 && female <= 0) {
    return 'none';
  }

  if (male <= 0) return 'female';
  if (female <= 0) return 'male';

  return Math.random() * (male + female) < male ? 'male' : 'female';
};

export const normalizePokemonGender = (gender, pokemon = {}) => {
  const options = getPokemonGenderOptions(pokemon);

  if (options.includes(gender)) {
    return gender;
  }

  if (options.length === 1) {
    return options[0];
  }

  return generatePokemonGender(pokemon);
};

export const shouldShowGenderIcon = (gender) => gender === 'male' || gender === 'female';
