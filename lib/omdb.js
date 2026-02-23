const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY

export async function searchMovies(query) {
  const res = await fetch(
    `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_KEY}&type=movie`
  )
  const data = await res.json()
  return data.Search || []
}

export async function searchShows(query) {
  const res = await fetch(
    `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${OMDB_KEY}&type=series`
  )
  const data = await res.json()
  return data.Search || []
}

export async function getDetails(imdbID) {
  const res = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_KEY}&plot=short`
  )
  return await res.json()
}
