import { defineStore } from "pinia";

export const useThemeStore = defineStore('theme', {
  state: () => ({
    game: {
      stageBgColor: '#46A1C8',
      boardBgColor: '#85DEFB',
      pointColor: '#926721',
      pointRadius: 16,
      startPointColor: '#EB3223',
      endPointColor: '#79E172',
      lineColor: '#000000',
      lineStrokeWidth: 1,
      edgeColor: '#926721',
      edgeActiveColor: '#F8CC55',
      stagePadding: 20,
      boardPadding: 40,
      gridWidth: 80,
      edgeWidth: 16,
    },
    layout: {
      windowInnerWidth: window.innerWidth,
      windowInnerHeight:  window.innerHeight,
    }
  }),
  actions: {
    setup() {
      window.addEventListener('resize', () => {
        this.layout.windowInnerHeight = window.innerHeight;
        this.layout.windowInnerWidth = window.innerWidth;
      });
    }
  }
})