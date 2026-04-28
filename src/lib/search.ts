export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isSubsequence(needle: string, haystack: string) {
  let needleIndex = 0;

  for (let haystackIndex = 0; haystackIndex < haystack.length; haystackIndex += 1) {
    if (haystack[haystackIndex] === needle[needleIndex]) {
      needleIndex += 1;
    }

    if (needleIndex === needle.length) {
      return true;
    }
  }

  return needleIndex === needle.length;
}

function getLevenshteinDistance(source: string, target: string, maxDistance: number) {
  if (Math.abs(source.length - target.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const currentRow = [sourceIndex];
    let rowMin = currentRow[0];

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      const value = Math.min(
        previousRow[targetIndex] + 1,
        currentRow[targetIndex - 1] + 1,
        previousRow[targetIndex - 1] + substitutionCost,
      );

      currentRow[targetIndex] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    for (let index = 0; index < currentRow.length; index += 1) {
      previousRow[index] = currentRow[index];
    }
  }

  return previousRow[target.length];
}

function getTokenScore(queryToken: string, optionToken: string) {
  if (optionToken === queryToken) {
    return 0;
  }

  if (optionToken.startsWith(queryToken)) {
    return 10 + (optionToken.length - queryToken.length);
  }

  if (optionToken.includes(queryToken)) {
    return 24 + optionToken.indexOf(queryToken);
  }

  if (queryToken.length >= 2 && isSubsequence(queryToken, optionToken)) {
    return 42 + (optionToken.length - queryToken.length);
  }

  const maxDistance = queryToken.length <= 4 ? 1 : 2;
  const distance = getLevenshteinDistance(queryToken, optionToken, maxDistance);

  if (distance <= maxDistance) {
    return 60 + distance * 8 + Math.abs(optionToken.length - queryToken.length);
  }

  return Number.POSITIVE_INFINITY;
}

function getTextScore(query: string, candidate: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  if (!normalizedQuery || !normalizedCandidate) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 4 + normalizedCandidate.length - normalizedQuery.length;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 12 + normalizedCandidate.indexOf(normalizedQuery);
  }

  const queryTokens = normalizedQuery.split(' ');
  const candidateTokens = normalizedCandidate.split(' ');
  let totalScore = 0;

  for (const queryToken of queryTokens) {
    let bestTokenScore = Number.POSITIVE_INFINITY;

    for (const candidateToken of candidateTokens) {
      bestTokenScore = Math.min(bestTokenScore, getTokenScore(queryToken, candidateToken));
    }

    if (!Number.isFinite(bestTokenScore)) {
      return Number.POSITIVE_INFINITY;
    }

    totalScore += bestTokenScore;
  }

  return totalScore + normalizedCandidate.length * 0.01;
}

export function getBestSearchScore(query: string, candidates: string[]) {
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    bestScore = Math.min(bestScore, getTextScore(query, candidate));
  }

  return bestScore;
}
