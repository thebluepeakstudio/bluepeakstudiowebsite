import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

/**
 * Paginated admin list with filter reset-to-page-1 and 30s stale cache.
 */
export function usePaginatedQuery(queryKey, fetchPage, filterDeps = []) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, filterDeps);

  const query = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  });

  const pagination = query.data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return {
    ...query,
    page,
    setPage,
    list: query.data?.list ?? [],
    pagination,
    loading: query.isLoading,
    fetching: query.isFetching,
  };
}
