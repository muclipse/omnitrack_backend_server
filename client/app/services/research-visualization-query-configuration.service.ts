import { Injectable, OnInit, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { filter, flatMap, map, tap, combineLatest } from 'rxjs/operators';
import { TrackingDataService } from "./tracking-data.service";
import * as moment from "moment-timezone";
import { diffDaysBetweenTwoMoments } from "../../../shared_lib/utils";
import { ResearchApiService } from "./research-api.service";
import { ITrackerDbEntity, IItemDbEntity, IUserDbEntity } from "../../../omnitrack/core/db-entity-types";
import { getExperimentDateSequenceOfParticipant } from "../../../omnitrack/experiment-utils";

const dayStartArg = { hour: 0, minute: 0, second: 0, millisecond: 0 };

@Injectable()
export class ResearchVisualizationQueryConfigurationService implements OnDestroy {
  private readonly _internalSubscriptions = new Subscription();

  private readonly _scopeSubject = new BehaviorSubject<Scope>(new Scope());

  private readonly _dayIndexRangeSubject = new BehaviorSubject<DayIndexRange>({ from: 0, to: 1 })

  private readonly _queriedDataset = new BehaviorSubject<FilteredExperimentDataset>(null)

  private _filteredParticipantIds
  private readonly _filteredParticipantIdsSubject: BehaviorSubject<Array<string>>

  public get filteredParticipantIds(): Observable<Array<string>> {
    return this._filteredParticipantIdsSubject
  }

  constructor(
    private api: ResearchApiService
  ) {

    const filteredString = localStorage.getItem("filtered_participants")
    if (filteredString) {
      this._filteredParticipantIds = JSON.parse(filteredString)
    } else { this._filteredParticipantIds = [] }

    this._filteredParticipantIdsSubject = new BehaviorSubject(this._filteredParticipantIds)

    this._internalSubscriptions.add(
      this._filteredParticipantIdsSubject.subscribe(
        ids => {
          localStorage.setItem('filtered_participants', JSON.stringify(ids))
        }
      )
    )

    this._internalSubscriptions.add(
      this.api.selectedExperimentService.pipe(flatMap(service => 
        service.getActiveParticipants().pipe(
          combineLatest(service.getExperiment(), (participants, experiment)=>({experiment: experiment, participants: participants}))
        ))).subscribe(
        project => {
          const participants = project.participants
          const experiment = project.experiment
          let earliestExperimentStart: number = null

          participants.forEach(participant => {
            const experimentRangeStart = new Date(participant.participationInfo.experimentRange.from).getTime()
            if (!earliestExperimentStart) { earliestExperimentStart = experimentRangeStart } else {
              earliestExperimentStart = Math.min(earliestExperimentStart, experimentRangeStart)
            }
          })


          if (earliestExperimentStart != null) {
            const today = moment().endOf("day").toDate()
            const end = Math.min((project.experiment.finishDate || today).getTime(), today.getTime())
            const numDays = diffDaysBetweenTwoMoments(moment(end), moment(earliestExperimentStart).startOf("day"), this.scope.includeWeekends) + 1

            this._dayIndexRangeSubject.next(
              { from: 0, to: numDays - 1 }
            )
          }
        }
      )
    )

    this._internalSubscriptions.add(
      this.makeScopeAndParticipantsObservable(true).pipe(flatMap(project => {
        const userIds = project.participants.map(p => p._id)
        return project.trackingDataService.getTrackersOfUser(userIds)
          .pipe(combineLatest(project.trackingDataService.getItemsOfUser(userIds), (trackers, items) => {
            // make data
            const today = moment().startOf("day")
            let earliestExperimentStart: number = null
            const data = project.participants.map(participant => {
              const experimentRangeStart = new Date(participant.participationInfo.experimentRange.from).getTime()
              if (!earliestExperimentStart) { earliestExperimentStart = experimentRangeStart } else {
                earliestExperimentStart = Math.min(earliestExperimentStart, experimentRangeStart)
              }

              const daySequenceOfParticipant = getExperimentDateSequenceOfParticipant(participant, today.toDate(), project.scope.includeWeekends)
              const trackingDataList = trackers.filter(tracker => tracker.user === participant._id).map(tracker => {
                const decodedItems = items.filter(item => item.tracker === tracker._id).map(item => {
                  const timestampMoment = moment(item.timestamp)
                  const day = daySequenceOfParticipant.findIndex(d => moment(d).isSame(timestampMoment, 'day'))
                  const dayRatio = timestampMoment.diff(moment(timestampMoment).startOf("day"), "days", true)
                  return { day: day, dayRatio: dayRatio, item: item }
                })
                return { tracker: tracker, decodedItems: decodedItems }
              })
              return {
                participant: participant,
                daySequence: daySequenceOfParticipant,
                trackingData: trackingDataList
              }
            })
            return { earliestExperimentStart: earliestExperimentStart, includesWeekends: project.scope.includeWeekends, data: data }
          }))
      })).subscribe((dataset: FilteredExperimentDataset) => {
        this._queriedDataset.next(dataset)
      })

    )

  }


  ngOnDestroy() {
    if (this.api.selectedExperimentServiceSync) {
      this.api.selectedExperimentServiceSync.trackingDataService.unregisterConsumer("queryConfigService")
    }
    this._internalSubscriptions.unsubscribe();
  }

  get scope(): Scope {
    return this._scopeSubject.value
  }

  get filteredDateset(): FilteredExperimentDataset {
    return this._queriedDataset.value
  }

  get filteredDatesetSubject(): Observable<FilteredExperimentDataset> {
    return this._queriedDataset.pipe(filter(dataset => dataset != null))
  }

  clearParticipantFilter() {
    if (this._filteredParticipantIds.length > 0) {
      this._filteredParticipantIds.splice(0, this._filteredParticipantIds.length)
      this._filteredParticipantIdsSubject.next(this._filteredParticipantIds)
    }
  }

  setParticipantFiltered(participantId: string, filterOut: boolean) {
    if (filterOut === true) {
      if (this._filteredParticipantIds.includes(participantId) !== true) {
        this._filteredParticipantIds.push(participantId)
        this._filteredParticipantIdsSubject.next(this._filteredParticipantIds)
      }
    } else {
      const i = this._filteredParticipantIds.indexOf(participantId)
      if (i !== -1) {
        this._filteredParticipantIds.splice(i, 1)
        this._filteredParticipantIdsSubject.next(this._filteredParticipantIds)
      }
    }

  }

  set scope(range: Scope) {
    /*
    if (this._scopeSubject.value) {
      // value exists
      if (range) {
        if (isEqual(this._scopeSubject.value, range) === false) {
          this._scopeSubject.next(range);
        }
      } else {
        this._scopeSubject.next(range);
      }
    } else {
      if (range) {
        this._scopeSubject.next(range);
      }
    }*/
    this._scopeSubject.next(range);
  }

  setIncludeWeekends(includeWeekends: boolean) {
    this.scope.includeWeekends = includeWeekends
    this._scopeSubject.next(this.scope)
  }

  includeWeekends(): Observable<boolean> {
    return this._scopeSubject.pipe(map(scope => scope.includeWeekends))
  }

  dayIndexRange(): Observable<Array<number>> {
    return this._dayIndexRangeSubject.pipe(map(range => [range.from, range.to]))
  }

  setDayIndexRange(range: Array<number>) {
    this._dayIndexRangeSubject.next({ from: range[0], to: range[1] })
  }

  get scopeSubject(): Observable<Scope> {
    return this._scopeSubject.pipe(filter(range => range != null));
  }

  public makeScopeAndParticipantsObservable(applyFilter: boolean): Observable<{ trackingDataService: TrackingDataService, scope: Scope, participants: Array<IUserDbEntity> }> {
    return this.api.selectedExperimentService.pipe(
      map(service => service.trackingDataService),
      tap(service => {
        service.registerConsumer("queryConfigService")
      }),
      combineLatest(this.scopeSubject, this.filteredParticipantIds,
        this.api.selectedExperimentService.pipe(flatMap(service => service.getActiveParticipants())), (service, scope, filteredParticipantIds, participants) => {
          return { trackingDataService: service, scope: scope, participants: participants.filter(p => filteredParticipantIds.includes(p._id) === false) }
        }
      ))
  }
}

export interface DayIndexRange {
  from: number,
  to: number
}

export class Scope {
  isAbsolute = false;
  rangeLength = 3;
  rangeUnit = "w";
  offset = 0;
  endPivot: number = Date.now();
  includeWeekends = false

  getRange(
    participant?: any,
    earliestPivot?: number
  ): { from: number; to: number } {
    const end = moment(this.endPivot)
      .set(dayStartArg)
      .add(1, "d");
    if (this.isAbsolute !== true) {
      // relative. check experimentRange
      const experimentRangeStart = moment(participant.experimentRange.from).set(
        dayStartArg
      );
      const earliest = moment(earliestPivot).set(dayStartArg);
      end.add(experimentRangeStart.valueOf() - earliest.valueOf(), "ms");
    }

    end.subtract((this.rangeLength * this.offset) as any, this.rangeUnit);
    const start = moment(end);
    start.subtract(this.rangeLength as any, this.rangeUnit);
    return { from: start.valueOf(), to: end.valueOf() };
  }
}

export interface FilteredExperimentDataset {
  earliestExperimentStart: number,
  includesWeekends: boolean,
  data: Array<{
    participant: IUserDbEntity,
    daySequence: Array<Date>,
    trackingData: Array<{
      tracker: ITrackerDbEntity,
      decodedItems: Array<{
        day: number,
        dayRatio: number,
        item: IItemDbEntity
      }>
    }>
  }>
}