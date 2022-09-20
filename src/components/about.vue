<template>
  <div class="about">
    <h3>玩法</h3>
    <ul>
      <li>点击高亮的木板，意味着拿起木板。</li>
      <li>
        在高亮的点和其他点之间点击，如果两点距离等于木板长度，成功放下木板。
      </li>
      <li>木板搭到终点时，完成挑战。</li>
    </ul>
    <h3>介绍</h3>
    <p>
      Plank Puzzle是一种利用木板组合完成各种布局挑战的Puzzle，出自
      <a href="http://www.clickmazes.com/planks/new-planks66.htm" target="blank"
        >clickmazes</a
      >
      。每个布局有一个起点和一个终点。
      想象一下，你控制一个小人从起点出发，沿着木板走到棋盘上的小岛。
      小人拿起一块木板，走到合适的小岛，放下木板搭到另一个小岛上。
      通过不断地构造路径，最终到达终点。
    </p>

    <h3>代码</h3>
    <p>
      本项目代码托管在
      <a href="https://github.com/addelete/plank-puzzle" target="blank"
        >Github</a
      >。
    </p>
  </div>
</template>

<script lang="ts" setup>
</script>

<style lang="scss">
.about {
  max-width: 640px;
  margin: 0 auto;
  height: 100%;
  padding: 20px;
  line-height: 1.8em;
  h1 {
    margin-bottom: 32px;
    text-align: center;
  }
  p,
  li {
    color: #aaa;
  }
}
</style>