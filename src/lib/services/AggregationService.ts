import { GROUP_BY_FIELDS, SORT_FIELDS } from '@/constants/document'

import type { DocumentGroupByArgs } from '../types/document'
import type { AggregationOptions, DocumentFilters } from '../types/filter'

import { filterService } from './FilterService'

export class AggregationService {
    /**
     * Строит запрос для агрегации данных
     * @param filters - Фильтры документов
     * @param aggregationOptions - Опции агрегации
     * @returns Prisma запрос для агрегации
     */
    buildAggregationQuery(
        filters: DocumentFilters,
        aggregationOptions: AggregationOptions
    ): DocumentGroupByArgs {
        const groupBy: DocumentGroupByArgs = {
            where: filterService.buildFilterQuery(filters),
            by: [aggregationOptions.groupBy ?? GROUP_BY_FIELDS.AUTHOR_ID],
            _count: aggregationOptions.count ? { _all: true } : undefined,
        }
        if (aggregationOptions.sum?.length) {
            groupBy._sum = {
                fileSize: aggregationOptions.sum.includes(SORT_FIELDS.FILE_SIZE)
                    ? true
                    : undefined,
                viewCount: aggregationOptions.sum.includes(
                    SORT_FIELDS.VIEW_COUNT
                )
                    ? true
                    : undefined,
                downloadCount: aggregationOptions.sum.includes(
                    SORT_FIELDS.DOWNLOAD_COUNT
                )
                    ? true
                    : undefined,
            }
        }

        return groupBy
    }
}

export const aggregationService = new AggregationService()
