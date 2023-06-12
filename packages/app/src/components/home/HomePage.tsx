import React from 'react';
import { Grid } from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';
import LocalLibrary from '@material-ui/icons/LocalLibrary';
import {
  HomePageToolkit,
  HomePageRandomJoke,
  HomePageStarredEntities,
  CustomHomepageGrid,
  WelcomeTitle
} from '@backstage/plugin-home';

const defaultConfig = [
  {
    component: 'HomePageStarredEntities',
    x: 0,
    y: 0,
    width: 6,
    height: 10,
  },
  {
    component: 'HomePageToolkit',
    x: 6,
    y: 0,
    width: 6,
    height: 10,
  },
];

const toolkitTools = [
  {
    url: 'https://wiki.rabe.ch',
    label: 'RaBe Wiki',
    icon: <LocalLibrary />,
  }
]

export const homePage = (
  <Page themeId="home">
    <Header title=<WelcomeTitle /> />
    <Content>
      <Grid container justifyContent="center" spacing={6}>
        <Grid container item xs={12} justifyContent='center'>
        </Grid>
      </Grid>
      <CustomHomepageGrid config={defaultConfig}>
        <HomePageToolkit
          tools={toolkitTools}
        />
        <HomePageRandomJoke />
        <HomePageStarredEntities />
      </CustomHomepageGrid>
    </Content>
  </Page>
)
